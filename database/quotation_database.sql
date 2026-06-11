-- ============================================================
-- INTERIOR DESIGN APP — Singapore Renovation Quotation Engine
-- Full PostgreSQL Schema + Seed Data
-- Version 1.0
-- ============================================================

-- ─── TABLES ──────────────────────────────────────────────────

CREATE TABLE categories (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE items (
  id            BIGSERIAL PRIMARY KEY,
  category_id   BIGINT NOT NULL REFERENCES categories(id),
  name          TEXT NOT NULL,
  description   TEXT,
  unit          TEXT NOT NULL,
  applicability TEXT NOT NULL,
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (category_id, name, unit)
);

CREATE TABLE price_tiers (
  id          BIGSERIAL PRIMARY KEY,
  item_id     BIGINT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  tier_name   TEXT NOT NULL,
  min_rate    NUMERIC(12,2) NOT NULL,
  low_rate    NUMERIC(12,2) NOT NULL,
  high_rate   NUMERIC(12,2) NOT NULL,
  currency    CHAR(3) NOT NULL DEFAULT 'SGD',
  notes       TEXT,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (item_id, tier_name)
);

CREATE TABLE quote_line_items (
  id             BIGSERIAL PRIMARY KEY,
  quote_id       BIGINT NOT NULL,
  item_id        BIGINT NOT NULL REFERENCES items(id),
  quantity       NUMERIC(12,2) NOT NULL DEFAULT 1,
  unit_rate      NUMERIC(12,2) NOT NULL,
  total_amount   NUMERIC(12,2) NOT NULL,
  selected_tier  TEXT,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── INDEXES ─────────────────────────────────────────────────

CREATE INDEX idx_items_category_id         ON items(category_id);
CREATE INDEX idx_price_tiers_item_id       ON price_tiers(item_id);
CREATE INDEX idx_quote_line_items_quote_id ON quote_line_items(quote_id);

-- ─── CATEGORIES SEED ─────────────────────────────────────────

INSERT INTO categories (name, sort_order) VALUES
('Preliminaries',         1),
('Design / PM',           2),
('Permits / Compliance',  3),
('Demolition',            4),
('Masonry',               5),
('Tiling',                6),
('Flooring',              7),
('Carpentry',             8),
('Painting',              9),
('Ceiling',              10),
('Partition',            11),
('Glassworks',           12),
('Electrical',           13),
('Lighting',             14),
('Plumbing / Sanitary',  15),
('Air-conditioning',     16),
('Doors / Hardware',     17),
('Metal Works',          18),
('Furnishing',           19),
('Accessories',          20),
('Signage',              21),
('Commercial',           22),
('Handover',             23);

-- ─── ITEMS SEED ──────────────────────────────────────────────

INSERT INTO items (category_id, name, description, unit, applicability)
SELECT c.id, v.name, v.description, v.unit, v.applicability
FROM (VALUES
  ('Preliminaries','Site measurement / assessment','Initial site visit and measurement','job','residential/commercial'),
  ('Preliminaries','Site protection and masking','Protection of finished areas','psf','residential/commercial'),
  ('Preliminaries','Debris disposal and carting','Varies by volume and access','job','residential/commercial'),

  ('Design / PM','Design fee','Could also be percentage based','job','residential/commercial'),
  ('Design / PM','Project management fee','Coordination and supervision','job','residential/commercial'),

  ('Permits / Compliance','Authority submissions','URA/BCA/MCST/landlord coordination as needed','job','commercial'),
  ('Permits / Compliance','Fire stopping / penetration sealing','Per penetration / opening','point','commercial'),

  ('Demolition','Hacking of non-load bearing wall','Subject to wall type and debris','psf','residential/commercial'),
  ('Demolition','Tile hacking','Excludes reinstatement','psf','residential/commercial'),
  ('Demolition','Floor screed removal','','psf','residential/commercial'),
  ('Demolition','Built-in cabinet dismantling','Depends on size and disposal','unit','residential/commercial'),

  ('Masonry','New brick wall','Thickness and reinforcement affect pricing','psf','residential/commercial'),
  ('Masonry','Cement screed','','psf','residential/commercial'),
  ('Masonry','Plastering / render','','psf','residential/commercial'),
  ('Masonry','Waterproof screed / topping','Wet areas','psf','residential/commercial'),
  ('Masonry','Kerb / plinth / upstand','','pfr','residential/commercial'),

  ('Tiling','Wall tiling','Tile type and layout drive rate','psf','residential/commercial'),
  ('Tiling','Floor tiling','','psf','residential/commercial'),
  ('Tiling','Mosaic tiling','','psf','residential/commercial'),
  ('Tiling','Tile skirting','','pfr','residential/commercial'),
  ('Tiling','Epoxy grout upgrade','Addon over base tiling','psf','residential/commercial'),

  ('Flooring','Vinyl flooring','','psf','residential/commercial'),
  ('Flooring','Laminate flooring','','psf','residential/commercial'),
  ('Flooring','Engineered timber flooring','','psf','residential/commercial'),
  ('Flooring','Parquet restoration','Sanding and varnish','psf','residential'),
  ('Flooring','Carpet tile','','psf','commercial'),
  ('Flooring','Epoxy floor coating','','psf','commercial'),

  ('Carpentry','Base cabinet','Laminate finish assumed','pfr','residential/commercial'),
  ('Carpentry','Wall cabinet','','pfr','residential/commercial'),
  ('Carpentry','Wardrobe','','pfr','residential'),
  ('Carpentry','TV feature wall','','set','residential'),
  ('Carpentry','Kitchen cabinet system','','pfr','residential/commercial'),
  ('Carpentry','Reception counter','','set','commercial'),

  ('Painting','Wall paint','Including sealer for normal surfaces','psf','residential/commercial'),
  ('Painting','Ceiling paint','','psf','residential/commercial'),
  ('Painting','Anti-mould paint upgrade','Wet areas / high humidity','psf','residential/commercial'),

  ('Ceiling','Plaster ceiling','Base board and framing','psf','residential/commercial'),
  ('Ceiling','L-box / U-box','','pfr','residential/commercial'),
  ('Ceiling','Cove light box','','pfr','residential/commercial'),
  ('Ceiling','Access panel','','unit','residential/commercial'),
  ('Ceiling','Acoustic ceiling system','','psf','commercial'),

  ('Partition','Drywall partition','','psf','residential/commercial'),
  ('Partition','Moisture-resistant partition','Bathroom or wet area','psf','residential/commercial'),
  ('Partition','Glass partition','Tempered or laminated','psf','commercial'),
  ('Partition','Acoustic partition','','psf','commercial'),

  ('Glassworks','Clear glass panel','','psf','residential/commercial'),
  ('Glassworks','Tempered glass panel','','psf','residential/commercial'),
  ('Glassworks','Frosted film / sandblast effect','','psf','residential/commercial'),
  ('Glassworks','Mirror installation','','psf','residential/commercial'),

  ('Electrical','Lighting point','Excludes decorative fixture unless specified','point','residential/commercial'),
  ('Electrical','Power point','','point','residential/commercial'),
  ('Electrical','Data point','Network cabling readiness','point','residential/commercial'),
  ('Electrical','TV point','','point','residential/commercial'),
  ('Electrical','Water heater point','','point','residential/commercial'),
  ('Electrical','DB upgrade / alteration','Depends on loading and circuit count','job','residential/commercial'),

  ('Lighting','Downlight supply and install','Fixture grade varies','unit','residential/commercial'),
  ('Lighting','Track light supply and install','','unit','residential/commercial'),
  ('Lighting','LED strip / cove light','Excludes transformer if needed','pfr','residential/commercial'),
  ('Lighting','Pendant light installation','','unit','residential/commercial'),

  ('Plumbing / Sanitary','Basin supply and install','Excludes countertop modifications','unit','residential/commercial'),
  ('Plumbing / Sanitary','Sink supply and install','','unit','residential/commercial'),
  ('Plumbing / Sanitary','WC supply and install','','unit','residential/commercial'),
  ('Plumbing / Sanitary','Mixer tap supply and install','','unit','residential/commercial'),
  ('Plumbing / Sanitary','Floor trap / gully','','unit','residential/commercial'),
  ('Plumbing / Sanitary','Piping works','','point','residential/commercial'),

  ('Air-conditioning','FCU relocation','','unit','residential/commercial'),
  ('Air-conditioning','Copper piping and insulation','','ft run','residential/commercial'),
  ('Air-conditioning','Trunking','','ft run','residential/commercial'),

  ('Doors / Hardware','HDB / room door','','unit','residential'),
  ('Doors / Hardware','Toilet door','','unit','residential/commercial'),
  ('Doors / Hardware','Sliding door system','','unit','residential/commercial'),
  ('Doors / Hardware','Lockset and ironmongery','','set','residential/commercial'),

  ('Metal Works','Mild steel bracket / support','','unit','residential/commercial'),
  ('Metal Works','Gate / grille','','psf','residential/commercial'),
  ('Metal Works','Stainless steel trim','','ft run','residential/commercial'),

  ('Furnishing','Curtains / blinds','','set','residential/commercial'),
  ('Furnishing','Loose furniture allowance','Budget placeholder','job','residential/commercial'),

  ('Accessories','Towel rack / paper holder / hooks','','unit','residential/commercial'),

  ('Signage','Indoor signage / branding','','set','commercial'),

  ('Commercial','Fire alarm relocation','By specialist contractor','point','commercial'),
  ('Commercial','Sprinkler relocation','By specialist contractor','point','commercial'),
  ('Commercial','Access control point','','point','commercial'),
  ('Commercial','Pantry fit-out','Includes base carpentry and sink allowance','set','commercial'),

  ('Handover','Cleaning and handover','Final cleaning and touch-up','job','residential/commercial'),
  ('Handover','Defects rectification allowance','Warranty reserve / call-back budget','job','residential/commercial')
) AS v(category_name, name, description, unit, applicability)
JOIN categories c ON c.name = v.category_name;

-- ─── PRICE TIERS SEED ────────────────────────────────────────

INSERT INTO price_tiers (item_id, tier_name, min_rate, low_rate, high_rate, notes)
SELECT i.id, v.tier_name, v.min_rate, v.low_rate, v.high_rate, v.notes
FROM (VALUES
  ('Site measurement / assessment','basic',150,200,400,'Initial site visit and measurement'),
  ('Site protection and masking','standard',0.8,1.2,2.0,'Protection of finished areas'),
  ('Debris disposal and carting','standard',250,400,900,'Varies by volume and access'),
  ('Design fee','standard',800,1500,5000,'Could also be percentage based'),
  ('Project management fee','standard',1200,2500,8000,'Coordination and supervision'),
  ('Authority submissions','standard',500,1200,3000,'URA/BCA/MCST/landlord coordination'),
  ('Fire stopping / penetration sealing','standard',35,60,120,'Per penetration / opening'),
  ('Hacking of non-load bearing wall','standard',4,6,10,'Subject to wall type and debris'),
  ('Tile hacking','standard',2.5,4,7,'Excludes reinstatement'),
  ('Floor screed removal','standard',2,3.5,6,''),
  ('Built-in cabinet dismantling','standard',80,150,350,'Depends on size and disposal'),
  ('New brick wall','standard',12,18,30,'Thickness and reinforcement affect pricing'),
  ('Cement screed','standard',2.5,4,7,''),
  ('Plastering / render','standard',3,5,9,''),
  ('Waterproof screed / topping','premium',4,7,12,'Wet areas'),
  ('Kerb / plinth / upstand','standard',18,28,45,''),
  ('Wall tiling','standard',5,8,14,'Tile type and layout drive rate'),
  ('Floor tiling','standard',6,9,16,''),
  ('Mosaic tiling','premium',9,14,24,''),
  ('Tile skirting','standard',4,6,10,''),
  ('Epoxy grout upgrade','premium',1.5,2.5,4.5,'Addon over base tiling'),
  ('Vinyl flooring','standard',4,6,10,''),
  ('Laminate flooring','standard',5,8,14,''),
  ('Engineered timber flooring','premium',10,14,22,''),
  ('Parquet restoration','premium',7,11,18,'Sanding and varnish'),
  ('Carpet tile','commercial',5,8,15,''),
  ('Epoxy floor coating','commercial',6,10,18,''),
  ('Base cabinet','standard',180,280,450,'Laminate finish assumed'),
  ('Wall cabinet','standard',150,240,400,''),
  ('Wardrobe','standard',220,350,600,''),
  ('TV feature wall','premium',1200,2200,5000,''),
  ('Kitchen cabinet system','standard',260,420,750,''),
  ('Reception counter','commercial',1800,3500,10000,''),
  ('Wall paint','standard',1.2,1.8,3.2,'Including sealer for normal surfaces'),
  ('Ceiling paint','standard',1.0,1.5,2.8,''),
  ('Anti-mould paint upgrade','premium',0.8,1.5,3.0,'Wet areas / high humidity'),
  ('Plaster ceiling','standard',3.75,4.8,5.8,'Base board and framing'),
  ('L-box / U-box','standard',22,35,60,''),
  ('Cove light box','standard',20,32,55,''),
  ('Access panel','standard',35,60,120,''),
  ('Acoustic ceiling system','commercial',8,12,20,''),
  ('Drywall partition','standard',4.2,5.5,7.2,''),
  ('Moisture-resistant partition','premium',5,6.5,8.5,'Bathroom or wet area'),
  ('Glass partition','premium',28,40,75,'Tempered or laminated'),
  ('Acoustic partition','commercial',12,18,30,''),
  ('Clear glass panel','standard',18,28,45,''),
  ('Tempered glass panel','premium',25,35,60,''),
  ('Frosted film / sandblast effect','standard',4,7,12,''),
  ('Mirror installation','standard',20,30,55,''),
  ('Lighting point','standard',45,60,100,'Excludes decorative fixture unless specified'),
  ('Power point','standard',35,50,90,''),
  ('Data point','commercial',45,65,120,'Network cabling readiness'),
  ('TV point','standard',40,60,100,''),
  ('Water heater point','standard',70,110,180,''),
  ('DB upgrade / alteration','commercial',250,500,1500,'Depends on loading and circuit count'),
  ('Downlight supply and install','standard',25,45,120,'Fixture grade varies'),
  ('Track light supply and install','standard',35,60,160,''),
  ('LED strip / cove light','standard',18,30,65,'Excludes transformer if needed'),
  ('Pendant light installation','standard',35,60,140,''),
  ('Basin supply and install','standard',120,180,450,'Excludes countertop modifications'),
  ('Sink supply and install','standard',150,220,600,''),
  ('WC supply and install','standard',180,280,800,''),
  ('Mixer tap supply and install','standard',60,110,300,''),
  ('Floor trap / gully','standard',45,80,180,''),
  ('Piping works','standard',60,90,180,''),
  ('FCU relocation','standard',180,300,700,''),
  ('Copper piping and insulation','standard',18,28,55,''),
  ('Trunking','standard',8,12,25,''),
  ('HDB / room door','standard',180,280,650,''),
  ('Toilet door','standard',220,350,800,''),
  ('Sliding door system','premium',450,800,2200,''),
  ('Lockset and ironmongery','standard',60,120,350,''),
  ('Mild steel bracket / support','standard',45,90,250,''),
  ('Gate / grille','standard',25,40,80,''),
  ('Stainless steel trim','premium',12,20,40,''),
  ('Curtains / blinds','standard',180,350,1200,''),
  ('Loose furniture allowance','standard',500,1500,10000,'Budget placeholder'),
  ('Towel rack / paper holder / hooks','standard',20,40,120,''),
  ('Indoor signage / branding','commercial',150,400,2500,''),
  ('Fire alarm relocation','commercial',80,150,350,'By specialist contractor'),
  ('Sprinkler relocation','commercial',90,180,400,'By specialist contractor'),
  ('Access control point','commercial',120,200,500,''),
  ('Pantry fit-out','commercial',1200,2500,12000,'Includes base carpentry and sink allowance'),
  ('Cleaning and handover','standard',120,250,800,'Final cleaning and touch-up'),
  ('Defects rectification allowance','standard',200,500,2000,'Warranty reserve / call-back budget')
) AS v(item_name, tier_name, min_rate, low_rate, high_rate, notes)
JOIN items i ON i.name = v.item_name;

-- ─── FUTURE FIELDS TO ADD (Phase 2) ──────────────────────────
-- ALTER TABLE price_tiers ADD COLUMN supplier_cost NUMERIC(12,2);
-- ALTER TABLE price_tiers ADD COLUMN sell_margin NUMERIC(5,2);
-- ALTER TABLE price_tiers ADD COLUMN tax_rate NUMERIC(5,2) DEFAULT 9.0;
-- ALTER TABLE price_tiers ADD COLUMN effective_date DATE;
-- ALTER TABLE price_tiers ADD COLUMN expiry_date DATE;
-- ALTER TABLE price_tiers ADD COLUMN revision_no INTEGER DEFAULT 1;
-- ALTER TABLE quote_line_items ADD COLUMN markup_pct NUMERIC(5,2);
-- ALTER TABLE quote_line_items ADD COLUMN discount_pct NUMERIC(5,2);
-- ALTER TABLE quote_line_items ADD COLUMN gst_amount NUMERIC(12,2);

-- ─── END ──────────────────────────────────────────────────────
