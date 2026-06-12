import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth";
import { heavyLimiter } from "../middleware/rateLimit";
import {
  getCategoriesWithItems,
  createQuotation,
  getQuotation,
  listQuotations,
  updateQuotation,
  updateQuotationStatus,
  explainQuoteItem,
} from "../services/quotationService";
import { generatePDF } from "../services/pdfService";
import { generateDocx } from "../services/docxService";
import { CreateQuotationSchema } from "../lib/schemas";
import { Sentry } from "../lib/sentry";

const router = Router();

// GET /api/quotation/catalog — full pricing catalog for MCQ builder
router.get("/catalog", requireAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    const catalog = await getCategoriesWithItems();
    res.json(catalog);
  } catch (err: any) {
    Sentry.captureException(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/quotation — list all quotes for this designer
router.get("/", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const quotes = await listQuotations(req.userId);
    res.json(quotes);
  } catch (err: any) {
    Sentry.captureException(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/quotation — create a new quotation draft
router.post("/", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const parsed = CreateQuotationSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors.map((e) => e.message).join(", ") });
    return;
  }

  const { client_name, project_address, project_type, total_sqft, rooms, line_items, design_session_id } = parsed.data;

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
    Sentry.captureException(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/quotation/:id — get a single quote
router.get("/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const quotation = await getQuotation(req.params.id as string, req.userId);
    res.json(quotation);
  } catch (err: any) {
    Sentry.captureException(err);
    res.status(404).json({ error: "Quotation not found" });
  }
});

// PATCH /api/quotation/:id — update a draft quotation
router.patch("/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { client_name, project_address, project_type, total_sqft, rooms, line_items } = req.body;

  if (!client_name || !project_address || !project_type || !total_sqft || !rooms?.length || !line_items?.length) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  try {
    const quotation = await updateQuotation(req.params.id as string, req.userId, {
      client_name,
      project_address,
      project_type,
      total_sqft,
      rooms,
      line_items,
    });
    res.json(quotation);
  } catch (err: any) {
    Sentry.captureException(err);
    const status = err.message.includes("not found") ? 404
      : err.message.includes("Only draft") ? 409 : 500;
    res.status(status).json({ error: err.message });
  }
});

// PATCH /api/quotation/:id/status — transition quote status
router.patch("/:id/status", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { status } = req.body;

  if (!status || !["draft", "sent", "accepted", "rejected"].includes(status)) {
    res.status(400).json({ error: "Invalid status. Must be: draft, sent, accepted, or rejected" });
    return;
  }

  try {
    const result = await updateQuotationStatus(req.params.id as string, req.userId, status);
    res.json(result);
  } catch (err: any) {
    Sentry.captureException(err);
    const httpStatus = err.message.includes("not found") ? 404
      : err.message.includes("Cannot transition") ? 409 : 500;
    res.status(httpStatus).json({ error: err.message });
  }
});

// GET /api/quotation/:id/pdf — export as PDF
router.get("/:id/pdf", heavyLimiter, requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const quotation = await getQuotation(req.params.id as string, req.userId);
    const pdfBuffer = await generatePDF(quotation);

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="quote-${req.params.id.slice(0, 8)}.pdf"`,
      "Content-Length": pdfBuffer.length,
    });
    res.end(pdfBuffer);
  } catch (err: any) {
    Sentry.captureException(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/quotation/:id/docx — export as an editable Word document
router.get("/:id/docx", heavyLimiter, requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const quotation = await getQuotation(req.params.id as string, req.userId);
    const buffer = await generateDocx(quotation);

    res.set({
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="quote-${req.params.id.slice(0, 8)}.docx"`,
      "Content-Length": buffer.length,
    });
    res.end(buffer);
  } catch (err: any) {
    Sentry.captureException(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/quotation/explain — AI-generated explanation for a quote line item
router.post("/explain", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, category, tier, unit, amount, rate } = req.body ?? {};
    if (!name || typeof name !== "string") {
      res.status(400).json({ error: "name is required" });
      return;
    }
    const explanation = await explainQuoteItem({
      name,
      category: String(category ?? ""),
      tier: String(tier ?? ""),
      unit: String(unit ?? ""),
      amount: Number(amount) || 0,
      rate: Number(rate) || 0,
    });
    res.json({ explanation });
  } catch (err: any) {
    Sentry.captureException(err);
    res.status(500).json({ error: err.message ?? "Explanation failed" });
  }
});

export default router;
