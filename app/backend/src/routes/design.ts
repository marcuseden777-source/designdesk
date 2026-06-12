import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth";
import { heavyLimiter } from "../middleware/rateLimit";
import { generateDesign, generateDesignWithControlNet } from "../services/designGenerationService";
import { uploadBuffer } from "../lib/s3";
import { uploadToSupabaseStorage, isSupabaseStorageConfigured } from "../lib/supabaseStorage";
import { supabaseAdmin } from "../lib/supabase";
import { GenerateDesignSchema } from "../lib/schemas";
import { Sentry } from "../lib/sentry";

const router = Router();

// POST /api/design/generate
router.post("/generate", heavyLimiter, requireAuth, async (req: Request, res: Response): Promise<void> => {
  const parsed = GenerateDesignSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors.map((e) => e.message).join(", ") });
    return;
  }

  const { session_id, style, selected_rooms, project_type, total_sqft } = parsed.data;

  try {
    // Fetch floor plan analysis and URL from session
    const { data: session, error: sessionError } = await supabaseAdmin
      .from("design_sessions")
      .select("floor_plan_analysis, floor_plan_url")
      .eq("id", session_id)
      .eq("designer_id", req.userId)
      .single();

    if (sessionError || !session?.floor_plan_analysis) {
      res.status(404).json({ error: "Session not found or has no floor plan analysis" });
      return;
    }

    // Use ControlNet (layout-preserving) if floor plan URL + Replicate token available
    // Otherwise fall back to Nvidia text-to-image
    let generatedResult: string;
    if (session.floor_plan_url && process.env.REPLICATE_API_TOKEN) {
      generatedResult = await generateDesignWithControlNet(
        session.floor_plan_url,
        session.floor_plan_analysis,
        style,
        selected_rooms,
        project_type,
        total_sqft ?? null
      );
    } else {
      generatedResult = await generateDesign(
        session.floor_plan_analysis,
        style,
        selected_rooms,
        project_type,
        total_sqft ?? null
      );
    }

    // Decode image from data URI or fetch from URL
    let imgBuffer: Buffer | null = null;
    if (generatedResult.startsWith("data:")) {
      const base64Data = generatedResult.split(",")[1];
      imgBuffer = Buffer.from(base64Data, "base64");
    }

    // Upload priority: S3 → Supabase Storage → data URI fallback
    let permanentUrl: string;
    if (process.env.S3_BUCKET_NAME && process.env.AWS_ACCESS_KEY_ID && imgBuffer) {
      permanentUrl = await uploadBuffer(imgBuffer, "image/jpeg", "generated-designs");
    } else if (isSupabaseStorageConfigured() && imgBuffer) {
      permanentUrl = await uploadToSupabaseStorage(imgBuffer, "image/jpeg", "generated-designs");
    } else {
      permanentUrl = generatedResult;
    }

    // Update session
    await supabaseAdmin
      .from("design_sessions")
      .update({
        generated_design_url: permanentUrl,
        selected_rooms,
        project_type,
        total_sqft: total_sqft ?? null,
        design_style_id: style.id,
        status: "generated",
      })
      .eq("id", session_id);

    res.json({ design_url: permanentUrl });
  } catch (err: any) {
    console.error("Design generation error:", err);
    Sentry.captureException(err);
    res.status(500).json({ error: err.message ?? "Generation failed" });
  }
});

export default router;
