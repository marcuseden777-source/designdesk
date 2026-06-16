import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth";
import { getEntitlement } from "../services/entitlementService";
import { PLANS, CREDIT_PACKS, getPlan, RENDER_COGS_SGD } from "../config/plans";

const router = Router();

/**
 * GET /api/billing/me — everything the paywall UI needs in one call:
 * current tier + this-month usage + the full plan + credit-pack catalogue.
 */
router.get("/me", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const entitlement = await getEntitlement(req.userId);
  res.json({
    entitlement,
    plan: getPlan(entitlement.tier),
    plans: Object.values(PLANS),
    creditPacks: CREDIT_PACKS,
    renderCogsSgd: RENDER_COGS_SGD,
  });
});

/**
 * POST /api/billing/checkout — start a Stripe Checkout for a plan or credit pack.
 * Stubbed (501) until STRIPE_SECRET_KEY + Price IDs are provisioned; the model is
 * already live, so wiring Stripe later is purely additive.
 */
router.post("/checkout", requireAuth, async (_req: Request, res: Response): Promise<void> => {
  if (!process.env.STRIPE_SECRET_KEY) {
    res.status(501).json({
      error: "billing_not_configured",
      message: "Online checkout is coming soon — Stripe is not yet connected.",
    });
    return;
  }
  // TODO(stripe): createCheckoutSession(req.userId, priceId) → { url }.
  // Resolve priceId from PLANS[*].stripePriceEnv* / CREDIT_PACKS[*].stripePriceEnv.
  res.status(501).json({
    error: "billing_not_configured",
    message: "Online checkout is coming soon.",
  });
});

export default router;
