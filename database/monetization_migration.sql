-- ============================================================
-- DESIGNDESK — Monetization migration (billing state + per-render metering)
-- Run in the Supabase SQL editor. Idempotent & safe to re-run.
-- Apply this BEFORE setting ENFORCE_ENTITLEMENTS=true on the backend.
-- The backend is fail-open: it runs fine before this is applied (usage just
-- isn't counted), so there is no deploy-order hazard.
-- ============================================================

-- ── 1. Billing state on designers ────────────────────────────
alter table designers add column if not exists stripe_customer_id  text;
alter table designers add column if not exists subscription_status text default 'inactive';
  -- subscription_status: active | trialing | past_due | canceled | inactive
alter table designers add column if not exists current_period_end  timestamptz;
alter table designers add column if not exists render_credits       integer not null default 0;
  -- render_credits: purchased pay-as-you-go renders, consumed after the monthly
  -- allowance is spent.

-- ── 2. Reconcile the tier enum: free | pro | studio ───────────
-- (the original schema used 'agency'; the pricing model uses 'studio')
update designers set subscription_tier = 'studio' where subscription_tier = 'agency';

alter table designers drop constraint if exists designers_subscription_tier_check;
alter table designers add constraint designers_subscription_tier_check
  check (subscription_tier in ('free', 'pro', 'studio'));

-- ── 3. Monthly usage counters (one row per designer per 'YYYY-MM') ──
create table if not exists usage_counters (
  designer_id  uuid not null references designers(id) on delete cascade,
  period       text not null,           -- 'YYYY-MM' (UTC)
  generations  int  not null default 0, -- AI renders consumed this period
  quotes       int  not null default 0, -- quotations created this period
  updated_at   timestamptz not null default now(),
  primary key (designer_id, period)
);

alter table usage_counters enable row level security;

-- Designers may read their own usage; the backend service-role key bypasses RLS
-- for the increment writes.
drop policy if exists "usage_own_read" on usage_counters;
create policy "usage_own_read" on usage_counters
  for select using (auth.uid() = designer_id);
