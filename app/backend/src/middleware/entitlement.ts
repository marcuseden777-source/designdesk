import { Request, Response, NextFunction } from "express";
import { getEntitlement } from "../services/entitlementService";
import { getPlan } from "../config/plans";

/**
 * Gate the render endpoint on the designer's plan allowance + purchased credits.
 *
 * Rollout-safe: defaults to LOG-ONLY (counts + logs, never blocks). Flip
 * ENFORCE_ENTITLEMENTS=true (after the migration is applied + counts look right)
 * to start returning 402 when a designer is over their limit. Fails OPEN on any
 * error, so a metering problem never takes generation down.
 */
const ENFORCE = process.env.ENFORCE_ENTITLEMENTS === "true";

export async function requireGenerationCredit(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ent = await getEntitlement(req.userId);
    if (!ent.canGenerate) {
      console.log(
        `[entitlement] over render limit user=${req.userId} tier=${ent.tier} ` +
          `used=${ent.rendersUsed}/${ent.includedRenders} credits=${ent.credits} enforce=${ENFORCE}`
      );
      if (ENFORCE) {
        const plan = getPlan(ent.tier);
        res.status(402).json({
          error: "render_limit_reached",
          message: `You've used all ${ent.includedRenders} renders in your ${plan.name} plan this month. Upgrade or add a render pack to continue.`,
          tier: ent.tier,
          rendersUsed: ent.rendersUsed,
          includedRenders: ent.includedRenders,
          credits: ent.credits,
          upgrade: true,
        });
        return;
      }
    }
  } catch (e: any) {
    console.warn("[entitlement] check failed, allowing (fail-open):", e?.message);
  }
  next();
}

/** Gate quote creation on the plan's monthly quota (free = 1/mo). Log-only unless enforced. */
export async function requireQuoteCredit(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ent = await getEntitlement(req.userId);
    if (!ent.canCreateQuote) {
      console.log(
        `[entitlement] over quote limit user=${req.userId} tier=${ent.tier} ` +
          `used=${ent.quotesUsed}/${ent.quotesIncluded} enforce=${ENFORCE}`
      );
      if (ENFORCE) {
        res.status(402).json({
          error: "quote_limit_reached",
          message: `You've reached your ${ent.quotesIncluded} quotation/month limit. Upgrade for unlimited quotations.`,
          tier: ent.tier,
          upgrade: true,
        });
        return;
      }
    }
  } catch (e: any) {
    console.warn("[entitlement] quote check failed, allowing (fail-open):", e?.message);
  }
  next();
}

/** Gate PDF/Word download on the plan (free tier is view-only). Log-only unless enforced. */
export async function requireDownloadEntitlement(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ent = await getEntitlement(req.userId);
    if (!ent.canDownloadExports) {
      console.log(`[entitlement] download blocked user=${req.userId} tier=${ent.tier} enforce=${ENFORCE}`);
      if (ENFORCE) {
        res.status(402).json({
          error: "download_not_allowed",
          message: "Downloading quotes requires a paid plan. Upgrade to export PDF & Word.",
          tier: ent.tier,
          upgrade: true,
        });
        return;
      }
    }
  } catch (e: any) {
    console.warn("[entitlement] download check failed, allowing (fail-open):", e?.message);
  }
  next();
}
