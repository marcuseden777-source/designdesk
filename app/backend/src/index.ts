import "dotenv/config";
import { validateEnv } from "./lib/validateEnv";
import { initSentry, Sentry } from "./lib/sentry";
validateEnv();
initSentry();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import { generalLimiter } from "./middleware/rateLimit";
import floorPlanRoutes from "./routes/floorPlan";
import designRoutes from "./routes/design";
import quotationRoutes from "./routes/quotation";
import billingRoutes from "./routes/billing";

const app = express();
const PORT = process.env.PORT ?? 3001;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(helmet());

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : [];

const DEFAULT_ORIGINS = [
  "http://localhost:8081",
  "http://localhost:3001",
  "http://localhost:19006",
  "https://designdesk.onrender.com",
];

app.use(
  cors({
    origin(origin, callback) {
      // Allow requests with no origin (mobile apps, curl, health checks)
      if (!origin) return callback(null, true);
      // Check explicit list
      if ([...DEFAULT_ORIGINS, ...ALLOWED_ORIGINS].includes(origin)) return callback(null, true);
      // Allow any *.vercel.app preview deployment
      if (origin.endsWith(".vercel.app")) return callback(null, true);
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  })
);

app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));
app.use(generalLimiter);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/floor-plan", floorPlanRoutes);
app.use("/api/design", designRoutes);
app.use("/api/quotation", quotationRoutes);
app.use("/api/billing", billingRoutes);

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => res.json({ status: "ok", ts: new Date().toISOString() }));

// ── Sentry error handler (must be after routes) ─────────────────────────────
if (process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: "Route not found" }));

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`DesignDesk API running on http://localhost:${PORT}`);
});

export default app;
