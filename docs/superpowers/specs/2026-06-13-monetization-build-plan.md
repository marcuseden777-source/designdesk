# Monetization Build Plan — Subscriptions + Metered Generation

**Goal:** make DesignDesk operational to sell subscriptions and meter AI generation.
**Status today (from audit):** pricing UI is a mockup; no Stripe; `designers.subscription_tier`
exists but is never enforced; `/api/design/generate` has only `requireAuth` + a rate
limiter — any logged-in user generates unlimited for free.

---

## Data model (Supabase)

Extend the existing **`designers`** table and add a **`usage_counters`** table.

```sql
-- designers: billing state
alter table designers add column if not exists stripe_customer_id   text;
alter table designers add column if not exists subscription_status   text default 'inactive'; -- active|trialing|past_due|canceled|inactive
alter table designers add column if not exists subscription_tier      text default 'free';     -- free|pro|studio
alter table designers add column if not exists current_period_end     timestamptz;

-- monthly usage, one row per designer per period
create table if not exists usage_counters (
  designer_id  uuid not null references auth.users(id) on delete cascade,
  period       text not null,            -- 'YYYY-MM'
  generations  int  not null default 0,
  quotes       int  not null default 0,
  primary key (designer_id, period)
);
alter table usage_counters enable row level security;
-- service role (backend) bypasses RLS; add a read policy if the client needs it:
create policy "own usage read" on usage_counters for select
  using (auth.uid() = designer_id);
```

**Tier limits** (mirror the pricing cards in `subscription.tsx`):

| tier  | generations/mo | quotes/mo |
|-------|----------------|-----------|
| free  | 1              | 3         |
| pro   | 20             | unlimited |
| studio| unlimited      | unlimited |

---

## Backend (Express)

1. **`services/entitlementService.ts`** — `getTierLimits(tier)`, `getUsage(userId, period)`,
   `assertCanGenerate(userId)` / `assertCanCreateQuote(userId)` (read tier from `designers`,
   read `usage_counters`, throw `EntitlementError(402)` when over limit),
   `incrementUsage(userId, kind)` (called after a successful generation/quote).
2. **`middleware/entitlement.ts`** — `requireGenerationCredit` / `requireQuoteCredit` used on
   `/api/design/generate` and `POST /api/quotation`. **Fail-open if the migration isn't applied**
   (missing table → log + allow) so a premature deploy never breaks generation.
3. **`services/stripeService.ts`** — `createCheckoutSession(userId, priceId)`,
   `createPortalSession(customerId)`, `handleWebhook(rawBody, sig)` →
   on `checkout.session.completed` / `customer.subscription.updated|deleted`, upsert
   `stripe_customer_id`, `subscription_tier`, `subscription_status`, `current_period_end`
   onto the `designers` row (lookup by `client_reference_id = userId`).
4. **`routes/billing.ts`** (mount at `/api/billing`):
   - `POST /checkout` (auth) → `{ url }`
   - `POST /portal`   (auth) → `{ url }`
   - `POST /webhook`  (raw body, Stripe signature — **mounted before `express.json()`**)
   - `GET  /me`       (auth) → `{ tier, status, usage, limits }` for the UI.

## Frontend (Expo)

5. `lib/api.ts`: `createCheckout(priceId)`, `getBilling()`.
6. `subscription.tsx`: replace the "Coming Soon" alert → call `createCheckout` → open the Stripe
   URL (web: redirect; native: `expo-web-browser`). Show current tier + usage.
7. Dashboard/builder: when a `402` comes back, show an "Upgrade" sheet linking to `subscription`.

---

## What YOU must provide / do (external — I can't do these)

- **Stripe account** → create 3 Products (Starter free, Professional S$49/mo, Studio S$129/mo),
  grab the **Price IDs** and **`STRIPE_SECRET_KEY`** + **`STRIPE_WEBHOOK_SECRET`**.
- Add those as **Render** backend env vars (runtime) and the Price IDs as
  `EXPO_PUBLIC_STRIPE_PRICE_PRO` / `_STUDIO` on the **Vercel frontend** (build-time) — or fetch
  prices from `/api/billing/me` (preferred, avoids a frontend rebuild).
- **Apply the SQL migration** above in the Supabase SQL editor **before** the enforcement code
  deploys.
- Decisions: **test mode first** (recommended) vs live; enforce limits **now** or soft-launch
  (log-only) first; Singapore **GST** handling in Stripe Tax.

---

## Safe rollout order (each step is committable + reversible)

1. Apply DB migration in Supabase (you). ← gate for everything else
2. Ship entitlement service + middleware in **log-only** mode (no blocking) → confirm counts look right.
3. Provision Stripe (you) → add keys to Render.
4. Ship `stripeService` + `billing` routes + webhook → test a checkout in **test mode**.
5. Flip entitlement middleware to **enforce** (402 over limit) + wire the frontend paywall.
6. Switch Stripe to **live**, add legal pages (Terms/Privacy/refund), go live.
