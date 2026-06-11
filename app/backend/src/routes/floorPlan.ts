import { Router, Request, Response } from "express";
import multer from "multer";
import { requireAuth } from "../middleware/auth";
import { analyzeFloorPlan } from "../services/floorPlanService";
import { supabaseAdmin } from "../lib/supabase";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } }); // 20MB max

// POST /api/floor-plan/analyze
// Uploads floor plan to S3, runs Claude Vision, saves analysis to DB
router.post(
  "/analyze",
  requireAuth,
  upload.single("floor_plan"),
  async (req: Request, res: Response): Promise<void> => {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    const { mimetype, buffer } = req.file;
    const allowed = ["image/jpeg", "image/png", "image/webp"];

    if (!allowed.includes(mimetype)) {
      res.status(400).json({ error: "Only JPEG, PNG, and WebP floor plans are supported" });
      return;
    }

    try {
      // 1. Upload to Supabase Storage
      const ext = mimetype.split("/")[1];
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from("floor-plans")
        .upload(fileName, buffer, { contentType: mimetype, upsert: false });
      if (uploadError) throw uploadError;
      const { data: { publicUrl: floorPlanUrl } } = supabaseAdmin.storage
        .from("floor-plans")
        .getPublicUrl(fileName);

      // 2. Analyse with Claude Vision
      const base64 = buffer.toString("base64");
      const analysis = await analyzeFloorPlan(
        base64,
        mimetype as "image/jpeg" | "image/png" | "image/webp"
      );

      // 3. Save design session to DB
      const { data: session, error } = await supabaseAdmin
        .from("design_sessions")
        .insert({
          designer_id: req.userId,
          floor_plan_url: floorPlanUrl,
          floor_plan_analysis: analysis,
          status: "analysed",
        })
        .select()
        .single();

      if (error) throw error;

      res.json({ session_id: session.id, floor_plan_url: floorPlanUrl, analysis });
    } catch (err: any) {
      console.error("Floor plan analysis error:", err);
      res.status(500).json({ error: err.message ?? "Analysis failed" });
    }
  }
);

// GET /api/floor-plan/session/:id
router.get("/session/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { data, error } = await supabaseAdmin
    .from("design_sessions")
    .select("*")
    .eq("id", req.params.id)
    .eq("designer_id", req.userId)
    .single();

  if (error) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  res.json(data);
});

export default router;
