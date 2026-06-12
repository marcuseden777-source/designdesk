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

**Phase 3** — Drag-drop room/template scaffolding; Word (.docx) + editable export;
saved per-client "quote templates"; backend template sync (cross-device).
