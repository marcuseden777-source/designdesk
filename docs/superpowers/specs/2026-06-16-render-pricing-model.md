# DesignDesk — Per-Render Pricing Model & Subscription Plans

**Date:** 2026-06-16
**Status:** Model + metering BUILT (log-only, fail-open). Stripe checkout stubbed (blocked on keys).
**Source of truth:** `app/backend/src/config/plans.ts` — edit there, the API and paywall follow.

---

## Value metric

**One AI render (a "per-photo render") = the billable unit.** It scales with
delivered value (more client-facing renders → more value), is trivial to
understand, and is hard to game.

## Unit economics (per render)

| Cost | ≈ SGD |
|---|---|
| fal.ai FLUX Kontext [dev] img2img | 0.05 |
| Claude prompt authoring (Sonnet) | 0.015 |
| storage + bandwidth | ~0 |
| **COGS / render** | **≈ 0.07** |

> Estimate — reconcile against live fal.ai + Anthropic invoices once volume exists.
> Overage is priced 13–17× COGS → ~92–95% gross margin per render.

## Plans (good–better–best)

| | **Starter** (free) | **Professional** | **Studio** |
|---|---|---|---|
| Price / mo | S$0 | **S$49** | S$129 |
| Annual (≈2 mo free) | — | S$490 | S$1,290 |
| **Included renders / mo** | 1 | 30 | 80 |
| Overage / extra render | — (must upgrade) | S$5 | S$5 |
| Quotations / mo | 1 (view-only) | unlimited | unlimited |
| Exports | **view-only — no download** | white-label | white-label |
| Layout-preserving (Kontext) | – | ✓ | ✓ |
| Variations / before-after | – | – | ✓ |

**Why these numbers** (owner-set 2026-06-16)
- **Free = 1 render + 1 view-only quote.** Deliberately thin — proves the magic
  once but can't be used for real work → strong upgrade pressure. Free quotes are
  **non-downloadable** (`canDownloadExports: false`).
- **No "unlimited."** Caps (30 / 80) + flat S$5 overage protect COGS (≈70× margin
  on extra renders) while covering a real designer's ~20–40/mo.

## Pay-as-you-go render packs

Bought on top of any plan; consumed after the monthly allowance is spent
(`designers.render_credits`). Priced as a light bulk discount off the S$5 rate.

| Pack | Renders | Price | Per render |
|---|---|---|---|
| pack_10 | 10 | S$45 | S$4.50 |
| pack_25 | 25 | S$100 | S$4.00 |
| pack_60 | 60 | S$210 | S$3.50 |

## How enforcement works

- Each successful `/api/design/generate` calls `recordGeneration(userId)` →
  `usage_counters(designer_id, period, generations)` +1; if over the monthly
  allowance and credits exist, one credit is burned.
- `requireGenerationCredit` middleware gates the endpoint. **Log-only by default**
  (`ENFORCE_ENTITLEMENTS` unset) — counts + logs, never blocks. Flip to `true` to
  return `402 { error: "render_limit_reached", upgrade: true }` when over limit.
- **Quotes**: `POST /api/quotation` → `requireQuoteCredit` (free = 1/mo) + `recordQuote`.
- **Downloads**: `GET /api/quotation/:id/pdf|docx` → `requireDownloadEntitlement`
  (free tier `canDownloadExports: false` → `402 download_not_allowed` when enforced).
- **Fail-open everywhere:** missing migration / table / column → free-tier
  defaults, allow. A premature deploy never breaks generation, quoting, or export.
- `GET /api/billing/me` returns `{ entitlement, plan, plans, creditPacks }` for the
  paywall UI (live usage strip on `subscription.tsx`).

## Rollout order (each step committable + reversible)

1. **Apply** `database/monetization_migration.sql` in Supabase. ← gate for enforcement
2. Deploy the backend (metering ships in **log-only** mode) → confirm `usage_counters` fills correctly.
3. Provision Stripe (owner): 3 plan Products + 3 pack Products → Price IDs + `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` on Render. Env names already referenced in `plans.ts` / `CREDIT_PACKS`.
4. Build `stripeService` + wire `POST /api/billing/checkout` + webhook (upsert tier/status/credits onto `designers`).
5. Flip `ENFORCE_ENTITLEMENTS=true` + wire the frontend 402 → upgrade sheet.
6. Stripe live mode + legal pages.

## Owner to provide (external — cannot be done from code)

- Stripe account + 6 Products (3 plans monthly/annual + 3 packs) → Price IDs.
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` on Render.
- Apply the SQL migration in Supabase.
- Decide: enforce now vs soft-launch (log-only first — recommended); Singapore GST via Stripe Tax.
