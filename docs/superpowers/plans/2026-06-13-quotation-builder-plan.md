# Quotation Builder — Plan

**Goal:** Make interior-design quoting fast and low-typing. One-time tedious setup
(reusable item library), then near-instant quoting by tapping image cards, with
guided structured input, drag-to-measure, AI explanations, and PDF/Word export.

## Existing foundation (build on, don't replace)
- Backend: `quotation` route (CRUD + `/catalog` + `/:id/pdf`), `quotationService`.
- Frontend: `app/(app)/quote/*` 4-step flow + `lib/quoteContext.tsx` (reducer,
  `LineItemPayload`, `ADD_LINE_ITEM`, `getSubtotal`, `formatSGD`).
- Design system: NativeWind, charcoal `#1a1a1a` / off-white `#fdfcf8` /
  terracotta `#b85c38`, Playfair Display (serif) + Montserrat (sans).

## Data model (extension)
`QuoteItemTemplate` — the reusable, image-backed library entry:
```
id, name, category, image?, icon, unit ("sqft"|"ftrun"|"nos"|"item"|"lot"),
input_mode ("measure"|"count"|"choice"), tiers [{ key, label, rate }],
breakdown? [{ label, qty, unit, rate }], default_notes?
```
A `LineItemPayload` is produced when a template is added (existing shape +
optional `measurement` and `breakdown` carried in `notes`/future columns).

## Design patterns
- **Strategy** for item input: `measure` (drag/stepper → sqft·ft-run),
  `count` (qty stepper), `choice` (MCQ tiers). One `AddItemSheet`, pluggable body.
- **Composite** for product breakdowns (an item = sum of sub-products).
- **Repository** for the template library (local seed now → backend `/templates`).
- **Command** = `ADD_LINE_ITEM` dispatch (already present); reuse for undo later.

## Phases
**Phase 1 (this session) — the interface**
- `quote/builder.tsx`: image-card library grid (tap = fast add), category filter,
  live quote panel (line items, subtotal/GST/total), export.
- `AddItemSheet`: tier MCQ + measurement control (draggable slider + stepper for
  sqft/ft-run, qty stepper for count) + **AI "Generate explanation"**.
- Backend `POST /api/quotation/explain` → one-paragraph item rationale (prose;
  reliable on any model).

**Phase 2 (done)** — `lib/quoteLibrary.ts` (Repository): seed + custom templates,
AsyncStorage persistence. `quote/new-item.tsx` template builder (create/edit):
MCQ category/unit/icon, photo picker, tier editor, Composite breakdown editor,
default quantity, AI-generated default description. Builder loads from the
repository and refreshes on focus; custom cards are editable (pencil/long-press),
deletable. *Deferred:* backend sync to `/api/quotation/templates` (currently
device-local AsyncStorage).

**Phase 3 (done)** — Room scaffolding + the design→quote layer + a bigger library:
- **Word (.docx) editable export** — `docxService.ts` + `GET /:id/docx`, with PDF +
  Word buttons in `review.tsx`. (commit 00357d9)
- **Library expansion** — `quoteTemplates.ts` grew from 10 → 30 seed items across
  11 categories (added Ceiling & Partition, Hacking & Masonry, Glass & Aluminium,
  Air-Con, Soft Furnishing). Added `ROOM_SUGGESTIONS` (room-type → typical items +
  qty sizing), `roomTypeFromName`, `quantityFor`, `getTemplateById`.
- **Room scaffolding** (in place of literal drag-drop, which is poor on touch):
  `builder.tsx` gains an active-room strip (per-room item counts) — tapped items
  file under that room — plus one-tap **Auto-scaffold** that bulk-adds a room's
  typical items, sized from area. Room shown in review + PDF + DOCX.
- **Quote the rendered design** (the new layer): `POST /api/quotation/suggest`
  (`suggestQuoteFromDesign`) reads a design session's rooms/sqft/style and the
  designer's own library, and Claude proposes line items per room — grounded in
  real library ids/rates, never invented. `quote/from-design.tsx` resolves the
  suggestions to line items, seeds the quote, and hands off to client capture →
  builder. Entry point: "Quote This Design with AI" on the design result screen.

*Still deferred:* saved per-client "quote templates" (whole-quote bundles);
backend template sync (the item library is still device-local AsyncStorage).
