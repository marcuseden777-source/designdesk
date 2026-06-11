-- ============================================================
-- DESIGNDESK — Additional tables (run AFTER quotation_database.sql)
-- ============================================================

-- ─── DESIGNERS ───────────────────────────────────────────────
-- Links to Supabase Auth users
CREATE TABLE designers (
  id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name         TEXT NOT NULL,
  email             TEXT NOT NULL UNIQUE,
  subscription_tier TEXT NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free','pro','agency')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create designer profile on sign-up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO designers (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Designer'),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── DESIGN SESSIONS ─────────────────────────────────────────
CREATE TABLE design_sessions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  designer_id           UUID NOT NULL REFERENCES designers(id) ON DELETE CASCADE,
  floor_plan_url        TEXT,
  floor_plan_analysis   JSONB,
  selected_rooms        TEXT[] DEFAULT '{}',
  project_type          TEXT,
  total_sqft            INTEGER,
  design_style_id       TEXT,
  generated_design_url  TEXT,
  status                TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','analysed','generating','generated','failed')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_design_sessions_designer ON design_sessions(designer_id);

-- ─── QUOTATIONS ───────────────────────────────────────────────
CREATE TABLE quotations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  designer_id       UUID NOT NULL REFERENCES designers(id) ON DELETE CASCADE,
  design_session_id UUID REFERENCES design_sessions(id) ON DELETE SET NULL,
  client_name       TEXT NOT NULL,
  project_address   TEXT NOT NULL,
  project_type      TEXT NOT NULL,
  total_sqft        INTEGER NOT NULL,
  rooms             TEXT[] NOT NULL DEFAULT '{}',
  subtotal          NUMERIC(12,2) NOT NULL,
  gst_amount        NUMERIC(12,2) NOT NULL,
  grand_total       NUMERIC(12,2) NOT NULL,
  status            TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','sent','accepted','rejected')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_quotations_designer ON quotations(designer_id);

-- Add room column to existing quote_line_items
ALTER TABLE quote_line_items
  ADD COLUMN IF NOT EXISTS room TEXT,
  ADD COLUMN IF NOT EXISTS quote_id_fk UUID REFERENCES quotations(id) ON DELETE CASCADE;

-- ─── ROW LEVEL SECURITY ───────────────────────────────────────
ALTER TABLE designers ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;

-- Designers can only see their own data
CREATE POLICY "designers_own" ON designers
  FOR ALL USING (id = auth.uid());

CREATE POLICY "sessions_own" ON design_sessions
  FOR ALL USING (designer_id = auth.uid());

CREATE POLICY "quotations_own" ON quotations
  FOR ALL USING (designer_id = auth.uid());
