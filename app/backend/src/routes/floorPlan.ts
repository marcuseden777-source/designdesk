import { Router, Request, Response } from "express";
import multer from "multer";
import { requireAuth } from "../middleware/auth";
import { heavyLimiter } from "../middleware/rateLimit";
import { analyzeFloorPlan, extractFloorPlanGeometry } from "../services/floorPlanService";
import { supabaseAdmin } from "../lib/supabase";
import { Sentry } from "../lib/sentry";
import { FromEditorSchema } from "../lib/schemas";
import { FloorPlanAnalysis, FloorPlanGeometry } from "../types";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } }); // 20MB max

const SQM_TO_SQFT = 10.7639;

/** Shoelace area (m²) of a metric polygon. */
function polygonSqm(polygon: [number, number][]): number {
  const n = polygon.length;
  if (n < 3) return 0;
  let twice = 0;
  for (let i = 0; i < n; i++) {
    const [x1, y1] = polygon[i];
    const [x2, y2] = polygon[(i + 1) % n];
    twice += x1 * y2 - x2 * y1;
  }
  return Math.abs(twice) / 2;
}

/** Derive a FloorPlanAnalysis from extracted geometry (rooms → sqft via shoelace). */
function geometryToAnalysis(geometry: FloorPlanGeometry): FloorPlanAnalysis {
  const rooms = geometry.rooms.map((r) => ({
    name: r.name,
    type: r.type,
    estimated_sqft: Math.round(polygonSqm(r.polygon) * SQM_TO_SQFT),
    is_wet_area: r.is_wet_area,
    notes: null,
  }));
  const total = rooms.reduce((s, r) => s + (r.estimated_sqft ?? 0), 0);
  return {
    layout_type: "extracted (vision)",
    total_estimated_sqft: total || null,
    rooms,
    wet_areas: rooms.filter((r) => r.is_wet_area).map((r) => r.name),
    structural_features: [],
    confidence: "medium", // single-shot vision geometry is approximate, editable in the Studio
    flags: geometry.notes ?? [],
  };
}

// POST /api/floor-plan/analyze
// Uploads floor plan to S3, runs Claude Vision, saves analysis to DB
router.post(
  "/analyze",
  heavyLimiter,
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
      Sentry.captureException(err);
      res.status(500).json({ error: err.message ?? "Analysis failed" });
    }
  }
);

// POST /api/floor-plan/extract-geometry
// Reads a floor-plan image into EDITABLE metric geometry (room polygons) via
// Claude Vision, derives a FloorPlanAnalysis from it, and persists a session so
// the 3D Studio can seed a scene (?session_id=). Geometry rides inside the
// floor_plan_analysis JSONB — no schema migration.
router.post(
  "/extract-geometry",
  heavyLimiter,
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
      // 1. Store the source image (also reused as the editor's tracing underlay).
      const ext = mimetype.split("/")[1];
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from("floor-plans")
        .upload(fileName, buffer, { contentType: mimetype, upsert: false });
      if (uploadError) throw uploadError;
      const { data: { publicUrl: floorPlanUrl } } = supabaseAdmin.storage
        .from("floor-plans")
        .getPublicUrl(fileName);

      // 2. Extract geometry, then derive the semantic analysis from it (one Claude call).
      const base64 = buffer.toString("base64");
      const geometry = await extractFloorPlanGeometry(
        base64,
        mimetype as "image/jpeg" | "image/png" | "image/webp"
      );
      const analysis = geometryToAnalysis(geometry);

      // 3. Persist (geometry nested in the analysis JSONB alongside floor_plan_url).
      const { data: session, error } = await supabaseAdmin
        .from("design_sessions")
        .insert({
          designer_id: req.userId,
          floor_plan_url: floorPlanUrl,
          floor_plan_analysis: { ...analysis, geometry },
          total_sqft: analysis.total_estimated_sqft,
          status: "analysed",
        })
        .select()
        .single();
      if (error) throw error;

      res.json({ session_id: session.id, floor_plan_url: floorPlanUrl, analysis, geometry });
    } catch (err: any) {
      console.error("Floor plan geometry extraction error:", err);
      Sentry.captureException(err);
      res.status(500).json({ error: err.message ?? "Geometry extraction failed" });
    }
  }
);

// POST /api/floor-plan/from-editor
// Accepts a designer-built layout from the 3D editor (top-down PNG + exact-area
// FloorPlanAnalysis) and persists a design_sessions row, so the existing
// /api/design/generate + quotation pipeline runs unchanged off it.
router.post("/from-editor", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const parsed = FromEditorSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors.map((e) => e.message).join(", ") });
    return;
  }
  const { analysis, image_base64, project_type, total_sqft } = parsed.data;

  try {
    // 1. Decode the top-down PNG (accepts a data: URL or raw base64) and store it.
    const b64 = image_base64.includes(",") ? image_base64.split(",")[1] : image_base64;
    const buffer = Buffer.from(b64, "base64");
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from("floor-plans")
      .upload(fileName, buffer, { contentType: "image/png", upsert: false });
    if (uploadError) throw uploadError;
    const {
      data: { publicUrl: floorPlanUrl },
    } = supabaseAdmin.storage.from("floor-plans").getPublicUrl(fileName);

    // 2. Persist the session (designer-built layout → high-confidence analysis).
    const selectedRooms = analysis.rooms.map((r) => r.name);
    const { data: session, error } = await supabaseAdmin
      .from("design_sessions")
      .insert({
        designer_id: req.userId,
        floor_plan_url: floorPlanUrl,
        floor_plan_analysis: analysis,
        selected_rooms: selectedRooms,
        project_type: project_type ?? null,
        total_sqft: total_sqft ?? analysis.total_estimated_sqft ?? null,
        status: "analysed",
      })
      .select()
      .single();
    if (error) throw error;

    res.json({ session_id: session.id, floor_plan_url: floorPlanUrl });
  } catch (err: any) {
    console.error("from-editor session error:", err);
    Sentry.captureException(err);
    res.status(500).json({ error: err.message ?? "Failed to create session from editor" });
  }
});

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

// GET /api/floor-plan — List all design sessions for the authenticated user
router.get("/", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { data, error } = await supabaseAdmin
    .from("design_sessions")
    .select("id, floor_plan_url, generated_design_url, design_style_id, status, created_at, project_type, total_sqft")
    .eq("designer_id", req.userId)
    .order("created_at", { ascending: false });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json(data ?? []);
});

export default router;
