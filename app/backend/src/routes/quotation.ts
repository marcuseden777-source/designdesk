import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth";
import {
  getCategoriesWithItems,
  createQuotation,
  getQuotation,
  listQuotations,
} from "../services/quotationService";
import { generatePDF } from "../services/pdfService";

const router = Router();

// GET /api/quotation/catalog — full pricing catalog for MCQ builder
router.get("/catalog", requireAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    const catalog = await getCategoriesWithItems();
    res.json(catalog);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/quotation — list all quotes for this designer
router.get("/", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const quotes = await listQuotations(req.userId);
    res.json(quotes);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/quotation — create a new quotation draft
router.post("/", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { client_name, project_address, project_type, total_sqft, rooms, line_items, design_session_id } = req.body;

  if (!client_name || !project_address || !project_type || !total_sqft || !rooms?.length || !line_items?.length) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  try {
    const quotation = await createQuotation(req.userId, {
      client_name,
      project_address,
      project_type,
      total_sqft,
      rooms,
      line_items,
      design_session_id,
    });
    res.status(201).json(quotation);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/quotation/:id — get a single quote
router.get("/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const quotation = await getQuotation(req.params.id, req.userId);
    res.json(quotation);
  } catch (err: any) {
    res.status(404).json({ error: "Quotation not found" });
  }
});

// GET /api/quotation/:id/pdf — export as PDF
router.get("/:id/pdf", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const quotation = await getQuotation(req.params.id, req.userId);
    const pdfBuffer = await generatePDF(quotation);

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="quote-${req.params.id.slice(0, 8)}.pdf"`,
      "Content-Length": pdfBuffer.length,
    });
    res.end(pdfBuffer);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
