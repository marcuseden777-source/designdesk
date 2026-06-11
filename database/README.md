# Database — Setup Guide

## Files in this folder

| File | Description |
|---|---|
| `quotation_database.sql` | Full PostgreSQL schema + seed data (23 categories, 83 items, price tiers) |
| `design_styles.json` | 20 interior design styles with color palettes and material rules |

---

## How to run the SQL

### Prerequisites
- PostgreSQL 14+ installed
- A database already created (e.g. `interior_design_app`)

### Run the schema + seed
```bash
psql -U your_user -d interior_design_app -f quotation_database.sql
```

### Verify it loaded correctly
```sql
SELECT COUNT(*) FROM categories;   -- expect 23
SELECT COUNT(*) FROM items;        -- expect 83
SELECT COUNT(*) FROM price_tiers;  -- expect 83
```

### Sample query — all tiling items with rates
```sql
SELECT i.name, pt.tier_name, pt.low_rate, pt.high_rate, i.unit
FROM items i
JOIN categories c ON c.id = i.category_id
JOIN price_tiers pt ON pt.item_id = i.id
WHERE c.name = 'Tiling'
ORDER BY i.name, pt.tier_name;
```

---

## Using with Supabase (recommended)

1. Create a new Supabase project at supabase.com
2. Go to SQL Editor
3. Paste and run `quotation_database.sql`
4. Use the Supabase client SDK in your Node.js backend to query

```javascript
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Example: fetch all items in a category
const { data, error } = await supabase
  .from('items')
  .select('*, categories(name), price_tiers(*)')
  .eq('categories.name', 'Tiling')
```

---

## Phase 2 fields (not active yet)

When ready to add margin, GST versioning, and supplier costs, 
uncomment the ALTER TABLE statements at the bottom of `quotation_database.sql`.
