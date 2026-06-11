import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import floorPlanRoutes from "./routes/floorPlan";
import designRoutes from "./routes/design";
import quotationRoutes from "./routes/quotation";

const app = express();
const PORT = process.env.PORT ?? 3001;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: "*" })); // Tighten to your domain in production
app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/floor-plan", floorPlanRoutes);
app.use("/api/design", designRoutes);
app.use("/api/quotation", quotationRoutes);

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => res.json({ status: "ok", ts: new Date().toISOString() }));

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: "Route not found" }));

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`DesignDesk API running on http://localhost:${PORT}`);
});

export default app;
