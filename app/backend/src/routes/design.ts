import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth";
import { generateDesign } from "../services/designGenerationService";
import { uploadBuffer } from "../lib/s3";
import { supabaseAdmin } from "../lib/supabase";
import axios from "axios";

const router = Router();

// POST /api/design/generate
router.post("/generate", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { session_id, style, selected_rooms, project_type, total_sqft } = req.body;

  if (!session_id || !style || !selected_rooms?.length || !project_type) {
    res.status(400).json({ error: "Missing required fields: session_id, style, selected_rooms, project_type" });
    return;
  }

  try {
    // Fetch floor plan analysis from session
    const { data: session, error: sessionError } = await supabaseAdmin
      .from("design_sessions")
      .select("floor_plan_analysis")
      .eq("id", session_id)
      .eq("designer_id", req.userId)
      .single();

    if (sessionError || !session?.floor_plan_analysis) {
      res.status(404).json({ error: "Session not found or has no floor plan analysis" });
      return;
    }

    // Generate via Flux 1 (Nvidia NIM)
    const generatedResult = await generateDesign(
      session.floor_plan_analysis,
      style,
      selected_rooms,
      project_type,
      total_sqft ?? null
    );

    // Result is a data URI (base64) — decode and upload to S3
    let imgBuffer: Buffer;
    if (generatedResult.startsWith("data:")) {
      const base64Data = generatedResult.split(",")[1];
      imgBuffer = Buffer.from(base64Data, "base64");
    } else {
      // HTTP URL fallback (if service returns a URL instead)
      const imgResponse = await axios.get(generatedResult, { responseType: "arraybuffer" });
      imgBuffer = Buffer.from(imgResponse.data);
    }
    const permanentUrl = await uploadBuffer(imgBuffer, "image/png", "generated-designs");

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
    res.status(500).json({ error: err.message ?? "Generation failed" });
  }
});

export default router;
