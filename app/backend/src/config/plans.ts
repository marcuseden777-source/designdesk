/**
 * DesignDesk monetization — SINGLE SOURCE OF TRUTH for the pricing model.
 *
 * Value metric: ONE AI render (a "per-photo render") is the billable unit.
 *
 * Unit economics (estimate — verify against live fal.ai + Anthropic invoices):
 *   fal.ai FLUX Kontext [dev] img2img  ≈ S$0.05 / render
 *   Claude prompt authoring (Sonnet)   ≈ S$0.015 / render
 *   storage + bandwidth                ≈ negligible
 *   ───────────────────────────────────────────────
 *   RENDER_COGS_SGD                    ≈ S$0.07 / render
 *
 * Hybrid model: every subscription includes a MONTHLY render allowance; beyond it
 * a designer either buys a CREDIT_PACK (pay-as-you-go) or is charged metered
 * overage (overagePerRender, S$5/render) or a pack. Both sit far above COGS.
 *
 * All numbers are config — edit here and both the API and the paywall follow.
 */

export type Tier = "free" | "pro" | "studio";

export const RENDER_COGS_SGD = 0.07;

export interface Plan {
  id: Tier;
  name: string;
  priceMonthly: number; // SGD / month
  priceAnnual: number; // SGD / year (≈ 2 months free)
  includedRenders: number; // per calendar month (NOT unlimited — COGS guard)
  overagePerRender: number | null; // SGD per render beyond the allowance; null = must upgrade
  quotesPerMonth: number | null; // null = unlimited
  watermark: boolean; // DesignDesk watermark / branding on exports
  canDownloadExports: boolean; // can download PDF/Word quotes (free tier = view-only)
  features: string[];
  // Stripe Price IDs are read from env at runtime (kept out of source).
  stripePriceEnvMonthly?: string;
  stripePriceEnvAnnual?: string;
}

export const PLANS: Record<Tier, Plan> = {
  free: {
    id: "free",
    name: "Starter",
    priceMonthly: 0,
    priceAnnual: 0,
    includedRenders: 1,
    overagePerRender: null, // free tier must upgrade to render more
    quotesPerMonth: 1,
    watermark: true,
    canDownloadExports: false, // view-only — cannot download PDF/Word
    features: [
      "1 AI render / month",
      "1 quotation / month (view-only — no download)",
      "Floor-plan analysis (Claude Vision)",
      "Upgrade to download PDF & Word",
    ],
  },
  pro: {
    id: "pro",
    name: "Professional",
    priceMonthly: 49,
    priceAnnual: 490, // ~2 months free
    includedRenders: 30,
    overagePerRender: 5,
    quotesPerMonth: null,
    watermark: false,
    canDownloadExports: true,
    features: [
      "30 AI renders / month",
      "Unlimited quotations",
      "Layout-preserving renders (Kontext)",
      "White-label PDF & Word export",
      "Extra renders at S$5 each",
      "Priority support",
    ],
    stripePriceEnvMonthly: "STRIPE_PRICE_PRO_MONTHLY",
    stripePriceEnvAnnual: "STRIPE_PRICE_PRO_ANNUAL",
  },
  studio: {
    id: "studio",
    name: "Studio",
    priceMonthly: 129,
    priceAnnual: 1290,
    includedRenders: 80,
    overagePerRender: 5,
    quotesPerMonth: null,
    watermark: false,
    canDownloadExports: true,
    features: [
      "80 AI renders / month",
      "Everything in Professional",
      "Design variations & before/after",
      "Priority render queue",
      "Extra renders at S$5 each",
      "Team seats (coming soon)",
    ],
    stripePriceEnvMonthly: "STRIPE_PRICE_STUDIO_MONTHLY",
    stripePriceEnvAnnual: "STRIPE_PRICE_STUDIO_ANNUAL",
  },
};

export interface CreditPack {
  id: string;
  renders: number;
  priceSGD: number;
  perRender: number;
  stripePriceEnv: string;
}

/** Pay-as-you-go render packs — bought on top of any plan, never expire while active. */
export const CREDIT_PACKS: CreditPack[] = [
  { id: "pack_10", renders: 10, priceSGD: 45, perRender: 4.5, stripePriceEnv: "STRIPE_PRICE_PACK_10" },
  { id: "pack_25", renders: 25, priceSGD: 100, perRender: 4.0, stripePriceEnv: "STRIPE_PRICE_PACK_25" },
  { id: "pack_60", renders: 60, priceSGD: 210, perRender: 3.5, stripePriceEnv: "STRIPE_PRICE_PACK_60" },
];

export function getPlan(tier: string | null | undefined): Plan {
  return PLANS[tier as Tier] ?? PLANS.free;
}

export function isValidTier(tier: string): tier is Tier {
  return tier === "free" || tier === "pro" || tier === "studio";
}
