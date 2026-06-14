import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth";
import { heavyLimiter } from "../middleware/rateLimit";
import { generateDesign, generateDesignWithKontext } from "../services/designGenerationService";
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

    // Generation strategy:
    //  1. LAYOUT-PRESERVING (preferred): FLUX Kontext restyles the actual
    //     uploaded floor plan, so the output matches the real walls/rooms.
    //     Needs the floor-plan URL + REPLICATE_API_TOKEN.
    //  2. FALLBACK: Claude authors a layout-aware prompt → Nvidia FLUX
    //     text-to-image (style-based, verified). Used when Kontext is
    //     unavailable or errors, so generation never goes down.
    let generatedResult: string;
    let mode: "kontext-layout-preserving" | "flux-text-to-image";
    let fallbackReason: string | undefined;
    if (session.floor_plan_url && process.env.REPLICATE_API_TOKEN) {
      try {
        generatedResult = await generateDesignWithKontext(
          session.floor_plan_url,
          session.floor_plan_analysis,
          style,
          selected_rooms,
          project_type,
          total_sqft ?? null
        );
        mode = "kontext-layout-preserving";
      } catch (kontextErr: any) {
        fallbackReason = kontextErr?.message ?? String(kontextErr);
        console.warn("Kontext (layout-preserving) failed, falling back to FLUX text-to-image:", kontextErr?.message);
        Sentry.captureException(kontextErr);
        generatedResult = await generateDesign(
          session.floor_plan_analysis,
          style,
          selected_rooms,
          project_type,
          total_sqft ?? null
        );
        mode = "flux-text-to-image";
      }
    } else {
      generatedResult = await generateDesign(
        session.floor_plan_analysis,
        style,
        selected_rooms,
        project_type,
        total_sqft ?? null
      );
      mode = "flux-text-to-image";
    }

    // Decode image from data URI or fetch from URL
    let imgBuffer: Buffer | null = null;
    if (generatedResult.startsWith("data:")) {
      const base64Data = generatedResult.split(",")[1];
      imgBuffer = Buffer.from(base64Data, "base64");
    }

    // Upload priority with graceful fallback: S3 → Supabase Storage → data URI.
    // Each tier is tried only if configured, and a failure (e.g. placeholder S3
    // credentials) falls through to the next tier instead of failing the request.
    const persistDesign = async (buf: Buffer): Promise<string> => {
      if (process.env.S3_BUCKET_NAME && process.env.AWS_ACCESS_KEY_ID) {
        try {
          return await uploadBuffer(buf, "image/jpeg", "generated-designs");
        } catch (e: any) {
          console.warn("S3 upload failed, trying Supabase Storage:", e?.message);
        }
      }
      if (isSupabaseStorageConfigured()) {
        try {
          return await uploadToSupabaseStorage(buf, "image/jpeg", "generated-designs");
        } catch (e: any) {
          console.warn("Supabase Storage upload failed, using data URI:", e?.message);
        }
      }
      return generatedResult; // inline data-URI fallback (already a data: URI)
    }

    const permanentUrl = imgBuffer ? await persistDesign(imgBuffer) : generatedResult;

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

    res.json({ design_url: permanentUrl, mode, ...(fallbackReason ? { fallback_reason: fallbackReason } : {}) });
  } catch (err: any) {
    console.error("Design generation error:", err);
    Sentry.captureException(err);
    res.status(500).json({ error: err.message ?? "Generation failed" });
  }
});

export default router;
