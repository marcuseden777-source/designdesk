import { supabaseAdmin } from "../lib/supabase";
import { getPlan, Tier } from "../config/plans";

/**
 * Entitlement + per-render metering.
 *
 * Designed to be SAFE on a backend deployed before the monetization migration is
 * applied: every read is defensive (missing columns / missing `usage_counters`
 * table → free-tier defaults, never throws) and every write is best-effort.
 */

/** Current billing period as 'YYYY-MM' (UTC). */
export function currentPeriod(date = new Date()): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export interface Entitlement {
  tier: Tier;
  status: string;
  period: string;
  rendersUsed: number;
  quotesUsed: number;
  includedRenders: number;
  rendersRemaining: number; // monthly allowance left (excludes purchased credits)
  credits: number; // purchased render credits (overage balance)
  canGenerate: boolean;
  quotesIncluded: number | null; // null = unlimited
  quotesRemaining: number | null; // null = unlimited
  canCreateQuote: boolean;
  canDownloadExports: boolean; // free tier = view-only (no PDF/Word download)
}

export async function getEntitlement(userId: string): Promise<Entitlement> {
  const period = currentPeriod();

  let tier: Tier = "free";
  let status = "inactive";
  let credits = 0;
  try {
    const { data } = await supabaseAdmin.from("designers").select("*").eq("id", userId).single();
    if (data) {
      tier = (data.subscription_tier as Tier) ?? "free";
      status = data.subscription_status ?? (tier === "free" ? "inactive" : "active");
      credits = Number(data.render_credits ?? 0);
    }
  } catch {
    /* fail-open: treat as free */
  }

  let rendersUsed = 0;
  let quotesUsed = 0;
  try {
    const { data } = await supabaseAdmin
      .from("usage_counters")
      .select("generations, quotes")
      .eq("designer_id", userId)
      .eq("period", period)
      .maybeSingle();
    if (data) {
      rendersUsed = data.generations ?? 0;
      quotesUsed = data.quotes ?? 0;
    }
  } catch {
    /* table may not exist yet → treat as zero usage */
  }

  const plan = getPlan(tier);
  const includedRenders = plan.includedRenders;
  const rendersRemaining = Math.max(0, includedRenders - rendersUsed);
  const canGenerate = rendersRemaining > 0 || credits > 0;

  const quotesIncluded = plan.quotesPerMonth; // null = unlimited
  const quotesRemaining = quotesIncluded === null ? null : Math.max(0, quotesIncluded - quotesUsed);
  const canCreateQuote = quotesIncluded === null || (quotesRemaining ?? 0) > 0;
  const canDownloadExports = plan.canDownloadExports;

  return {
    tier, status, period, rendersUsed, quotesUsed, includedRenders, rendersRemaining, credits, canGenerate,
    quotesIncluded, quotesRemaining, canCreateQuote, canDownloadExports,
  };
}

/**
 * Record one render against the monthly counter. If the included allowance is
 * already spent, burn one purchased credit. Best-effort: never throws, so a
 * metering hiccup can never fail an already-successful generation.
 */
export async function recordGeneration(userId: string): Promise<void> {
  const period = currentPeriod();
  try {
    const ent = await getEntitlement(userId);
    await supabaseAdmin
      .from("usage_counters")
      .upsert(
        { designer_id: userId, period, generations: ent.rendersUsed + 1, updated_at: new Date().toISOString() },
        { onConflict: "designer_id,period" }
      );

    // Over the included allowance → consume a purchased credit if available.
    if (ent.rendersRemaining <= 0 && ent.credits > 0) {
      await supabaseAdmin.from("designers").update({ render_credits: ent.credits - 1 }).eq("id", userId);
    }
  } catch (e: any) {
    console.warn("[entitlement] recordGeneration failed (non-fatal):", e?.message);
  }
}

/** Record one quotation against the monthly counter. Best-effort. */
export async function recordQuote(userId: string): Promise<void> {
  const period = currentPeriod();
  try {
    const ent = await getEntitlement(userId);
    await supabaseAdmin
      .from("usage_counters")
      .upsert(
        { designer_id: userId, period, quotes: ent.quotesUsed + 1, updated_at: new Date().toISOString() },
        { onConflict: "designer_id,period" }
      );
  } catch (e: any) {
    console.warn("[entitlement] recordQuote failed (non-fatal):", e?.message);
  }
}
