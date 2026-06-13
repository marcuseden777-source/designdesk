import { Ionicons } from "@expo/vector-icons";

/** Unit of measure for a quote item. */
export type QuoteUnit = "sqft" | "ftrun" | "nos" | "item" | "lot";

/** How the designer inputs the amount when adding the item. */
export type InputMode = "measure" | "count" | "choice";

export interface QuoteTier {
  key: string;
  label: string;
  /** Rate per unit, in SGD. */
  rate: number;
}

export interface BreakdownPart {
  label: string;
  qty: number;
  unit: string;
  rate: number;
}

/**
 * A reusable, image-backed library entry. The "tedious one-time setup" — once a
 * designer builds these, quoting is tap-to-add with almost no typing.
 */
export interface QuoteItemTemplate {
  id: string;
  name: string;
  category: string;
  /** Optional photo URL; falls back to the category icon tile. */
  image?: string;
  icon: keyof typeof Ionicons.glyphMap;
  unit: QuoteUnit;
  inputMode: InputMode;
  /** Tier options (Standard / Premium / Luxury …). First is the default. */
  tiers: QuoteTier[];
  /** Optional product breakdown (composite of sub-products). */
  breakdown?: BreakdownPart[];
  defaultNotes?: string;
  /** Sensible starting amount for the measure/count control. */
  defaultAmount?: number;
}

export interface QuoteCategory {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string; // hex, used for the card image tile
}

export const QUOTE_CATEGORIES: QuoteCategory[] = [
  { key: "flooring", label: "Flooring", icon: "grid-outline", tint: "#b85c38" },
  { key: "carpentry", label: "Carpentry", icon: "cube-outline", tint: "#8f6b4a" },
  { key: "ceiling", label: "Ceiling & Partition", icon: "browsers-outline", tint: "#7a8b9a" },
  { key: "masonry", label: "Hacking & Masonry", icon: "hammer-outline", tint: "#9a7b5a" },
  { key: "glass", label: "Glass & Aluminium", icon: "scan-outline", tint: "#5a8a8f" },
  { key: "lighting", label: "Lighting", icon: "bulb-outline", tint: "#c9962f" },
  { key: "painting", label: "Painting", icon: "color-palette-outline", tint: "#6a7f6a" },
  { key: "plumbing", label: "Plumbing", icon: "water-outline", tint: "#4a7f8f" },
  { key: "electrical", label: "Electrical", icon: "flash-outline", tint: "#9a6f3a" },
  { key: "aircon", label: "Air-Con", icon: "snow-outline", tint: "#4a90a8" },
  { key: "furnishing", label: "Soft Furnishing", icon: "bed-outline", tint: "#a87a6a" },
];

/**
 * Seed library. In production this is loaded per-designer from the backend
 * (`/api/quotation/templates`); seeded here so the builder is usable immediately.
 */
export const SEED_TEMPLATES: QuoteItemTemplate[] = [
  {
    id: "vinyl-flooring",
    name: "Vinyl Flooring",
    category: "flooring",
    icon: "grid-outline",
    unit: "sqft",
    inputMode: "measure",
    defaultAmount: 250,
    tiers: [
      { key: "std", label: "Standard", rate: 4.5 },
      { key: "prm", label: "Premium", rate: 7.0 },
      { key: "lux", label: "Luxury", rate: 11.5 },
    ],
    breakdown: [
      { label: "SPC vinyl plank", qty: 1, unit: "sqft", rate: 3.2 },
      { label: "Underlay + adhesive", qty: 1, unit: "sqft", rate: 0.8 },
      { label: "Installation labour", qty: 1, unit: "sqft", rate: 0.5 },
    ],
    defaultNotes: "Supply and lay click-lock vinyl, including underlay and skirting trim.",
  },
  {
    id: "tile-flooring",
    name: "Porcelain Tiling",
    category: "flooring",
    icon: "apps-outline",
    unit: "sqft",
    inputMode: "measure",
    defaultAmount: 120,
    tiers: [
      { key: "std", label: "Standard", rate: 8 },
      { key: "prm", label: "Premium", rate: 13 },
      { key: "lux", label: "Marble-look", rate: 22 },
    ],
  },
  {
    id: "kitchen-cabinet",
    name: "Kitchen Cabinetry",
    category: "carpentry",
    icon: "cube-outline",
    unit: "ftrun",
    inputMode: "measure",
    defaultAmount: 18,
    tiers: [
      { key: "std", label: "Laminate", rate: 280 },
      { key: "prm", label: "Acrylic", rate: 420 },
      { key: "lux", label: "Solid surface", rate: 650 },
    ],
    breakdown: [
      { label: "Carcass + doors", qty: 1, unit: "ftrun", rate: 180 },
      { label: "Soft-close hardware", qty: 1, unit: "ftrun", rate: 60 },
      { label: "Installation", qty: 1, unit: "ftrun", rate: 40 },
    ],
    defaultNotes: "Top and bottom kitchen cabinets with soft-close hinges and runners.",
  },
  {
    id: "wardrobe",
    name: "Built-in Wardrobe",
    category: "carpentry",
    icon: "file-tray-stacked-outline",
    unit: "ftrun",
    inputMode: "measure",
    defaultAmount: 8,
    tiers: [
      { key: "std", label: "Swing door", rate: 230 },
      { key: "prm", label: "Sliding door", rate: 320 },
      { key: "lux", label: "Glass + LED", rate: 480 },
    ],
  },
  {
    id: "feature-wall",
    name: "Feature Wall",
    category: "carpentry",
    icon: "albums-outline",
    unit: "sqft",
    inputMode: "measure",
    defaultAmount: 40,
    tiers: [
      { key: "std", label: "Laminate", rate: 16 },
      { key: "prm", label: "Fluted panel", rate: 28 },
      { key: "lux", label: "Stone veneer", rate: 45 },
    ],
  },
  {
    id: "downlight",
    name: "LED Downlight",
    category: "lighting",
    icon: "bulb-outline",
    unit: "nos",
    inputMode: "count",
    defaultAmount: 12,
    tiers: [
      { key: "std", label: "Standard", rate: 28 },
      { key: "prm", label: "Dimmable", rate: 45 },
    ],
    defaultNotes: "Supply and install recessed LED downlights including wiring.",
  },
  {
    id: "cove-light",
    name: "Cove Lighting",
    category: "lighting",
    icon: "remove-outline",
    unit: "ftrun",
    inputMode: "measure",
    defaultAmount: 24,
    tiers: [
      { key: "std", label: "Warm strip", rate: 14 },
      { key: "prm", label: "RGB strip", rate: 22 },
    ],
  },
  {
    id: "painting",
    name: "Wall Painting",
    category: "painting",
    icon: "color-palette-outline",
    unit: "sqft",
    inputMode: "measure",
    defaultAmount: 900,
    tiers: [
      { key: "std", label: "1 coat + 1 finish", rate: 0.9 },
      { key: "prm", label: "2 finish coats", rate: 1.4 },
      { key: "lux", label: "Premium emulsion", rate: 2.1 },
    ],
  },
  {
    id: "vanity",
    name: "Vanity & Basin",
    category: "plumbing",
    icon: "water-outline",
    unit: "nos",
    inputMode: "count",
    defaultAmount: 1,
    tiers: [
      { key: "std", label: "Standard", rate: 380 },
      { key: "prm", label: "Designer", rate: 720 },
    ],
  },
  {
    id: "power-point",
    name: "Power Point",
    category: "electrical",
    icon: "flash-outline",
    unit: "nos",
    inputMode: "count",
    defaultAmount: 8,
    tiers: [
      { key: "std", label: "13A socket", rate: 65 },
      { key: "prm", label: "USB socket", rate: 95 },
    ],
  },

  // ── Flooring ──────────────────────────────────────────────────────────────
  {
    id: "laminate-flooring",
    name: "Laminate Flooring",
    category: "flooring",
    icon: "layers-outline",
    unit: "sqft",
    inputMode: "measure",
    defaultAmount: 250,
    tiers: [
      { key: "std", label: "AC4 12mm", rate: 5.5 },
      { key: "prm", label: "AC5 herringbone", rate: 9 },
    ],
    defaultNotes: "Supply and lay laminate flooring with foam underlay and matching skirting.",
  },
  {
    id: "marble-flooring",
    name: "Marble / Stone",
    category: "flooring",
    icon: "diamond-outline",
    unit: "sqft",
    inputMode: "measure",
    defaultAmount: 120,
    tiers: [
      { key: "std", label: "Compressed marble", rate: 18 },
      { key: "prm", label: "Natural marble", rate: 32 },
      { key: "lux", label: "Book-matched slab", rate: 55 },
    ],
  },
  {
    id: "skirting",
    name: "Skirting",
    category: "flooring",
    icon: "remove-outline",
    unit: "ftrun",
    inputMode: "measure",
    defaultAmount: 120,
    tiers: [
      { key: "std", label: "PVC", rate: 3 },
      { key: "prm", label: "Timber", rate: 6 },
    ],
  },

  // ── Carpentry ─────────────────────────────────────────────────────────────
  {
    id: "tv-console",
    name: "TV Feature Console",
    category: "carpentry",
    icon: "tv-outline",
    unit: "ftrun",
    inputMode: "measure",
    defaultAmount: 10,
    tiers: [
      { key: "std", label: "Laminate", rate: 240 },
      { key: "prm", label: "Acrylic + LED", rate: 380 },
    ],
    defaultNotes: "Custom TV console with concealed cable management and feature wall panel.",
  },
  {
    id: "shoe-cabinet",
    name: "Shoe Cabinet",
    category: "carpentry",
    icon: "footsteps-outline",
    unit: "ftrun",
    inputMode: "measure",
    defaultAmount: 6,
    tiers: [
      { key: "std", label: "Laminate", rate: 220 },
      { key: "prm", label: "Full-height", rate: 340 },
    ],
  },
  {
    id: "study-table",
    name: "Study / Work Desk",
    category: "carpentry",
    icon: "easel-outline",
    unit: "ftrun",
    inputMode: "measure",
    defaultAmount: 6,
    tiers: [
      { key: "std", label: "Laminate top", rate: 180 },
      { key: "prm", label: "With overhead", rate: 300 },
    ],
  },
  {
    id: "kitchen-island",
    name: "Kitchen Island",
    category: "carpentry",
    icon: "albums-outline",
    unit: "ftrun",
    inputMode: "measure",
    defaultAmount: 6,
    tiers: [
      { key: "std", label: "Laminate + quartz", rate: 420 },
      { key: "lux", label: "Sintered stone", rate: 720 },
    ],
    defaultNotes: "Free-standing island with quartz/sintered top and storage below.",
  },
  {
    id: "kitchen-top",
    name: "Solid Surface Worktop",
    category: "carpentry",
    icon: "tablet-landscape-outline",
    unit: "ftrun",
    inputMode: "measure",
    defaultAmount: 14,
    tiers: [
      { key: "std", label: "Quartz", rate: 95 },
      { key: "prm", label: "Sintered stone", rate: 160 },
    ],
  },

  // ── Ceiling & Partition ───────────────────────────────────────────────────
  {
    id: "false-ceiling",
    name: "False Ceiling (L-Box)",
    category: "ceiling",
    icon: "browsers-outline",
    unit: "ftrun",
    inputMode: "measure",
    defaultAmount: 30,
    tiers: [
      { key: "std", label: "Plaster L-box", rate: 14 },
      { key: "prm", label: "With cove + cornice", rate: 22 },
    ],
    defaultNotes: "Plasterboard false ceiling with concealed cove lighting recess.",
  },
  {
    id: "ceiling-full",
    name: "Full False Ceiling",
    category: "ceiling",
    icon: "square-outline",
    unit: "sqft",
    inputMode: "measure",
    defaultAmount: 120,
    tiers: [
      { key: "std", label: "Plasterboard", rate: 6.5 },
      { key: "prm", label: "Moisture-resistant", rate: 9 },
    ],
  },
  {
    id: "partition-wall",
    name: "Partition Wall",
    category: "ceiling",
    icon: "git-branch-outline",
    unit: "sqft",
    inputMode: "measure",
    defaultAmount: 60,
    tiers: [
      { key: "std", label: "Drywall", rate: 8 },
      { key: "prm", label: "Acoustic drywall", rate: 13 },
    ],
  },

  // ── Hacking & Masonry ─────────────────────────────────────────────────────
  {
    id: "hacking",
    name: "Hacking Works",
    category: "masonry",
    icon: "hammer-outline",
    unit: "lot",
    inputMode: "count",
    defaultAmount: 1,
    tiers: [
      { key: "std", label: "Per area", rate: 850 },
      { key: "prm", label: "Whole unit", rate: 2200 },
    ],
    defaultNotes: "Hacking of existing finishes and disposal of debris.",
  },
  {
    id: "brickwork",
    name: "Brickwall + Plaster",
    category: "masonry",
    icon: "grid-outline",
    unit: "sqft",
    inputMode: "measure",
    defaultAmount: 40,
    tiers: [
      { key: "std", label: "Half-brick", rate: 14 },
      { key: "prm", label: "Full-brick", rate: 22 },
    ],
  },
  {
    id: "waterproofing",
    name: "Waterproofing",
    category: "masonry",
    icon: "umbrella-outline",
    unit: "sqft",
    inputMode: "measure",
    defaultAmount: 60,
    tiers: [
      { key: "std", label: "2-coat membrane", rate: 6 },
      { key: "prm", label: "PU + screed", rate: 10 },
    ],
    defaultNotes: "Wet-area waterproofing membrane with 24-hour ponding test.",
  },

  // ── Glass & Aluminium ─────────────────────────────────────────────────────
  {
    id: "shower-screen",
    name: "Shower Screen",
    category: "glass",
    icon: "scan-outline",
    unit: "nos",
    inputMode: "count",
    defaultAmount: 1,
    tiers: [
      { key: "std", label: "Fixed panel", rate: 480 },
      { key: "prm", label: "Frameless swing", rate: 850 },
    ],
  },
  {
    id: "glass-door",
    name: "Glass Sliding Door",
    category: "glass",
    icon: "albums-outline",
    unit: "nos",
    inputMode: "count",
    defaultAmount: 1,
    tiers: [
      { key: "std", label: "Aluminium frame", rate: 720 },
      { key: "prm", label: "Slim black frame", rate: 1150 },
    ],
  },
  {
    id: "aluminium-window",
    name: "Aluminium Window",
    category: "glass",
    icon: "tablet-portrait-outline",
    unit: "nos",
    inputMode: "count",
    defaultAmount: 2,
    tiers: [
      { key: "std", label: "Casement", rate: 650 },
      { key: "prm", label: "Top-hung tinted", rate: 900 },
    ],
  },

  // ── Lighting ──────────────────────────────────────────────────────────────
  {
    id: "pendant-light",
    name: "Pendant Light",
    category: "lighting",
    icon: "bulb-outline",
    unit: "nos",
    inputMode: "count",
    defaultAmount: 2,
    tiers: [
      { key: "std", label: "Standard", rate: 120 },
      { key: "prm", label: "Designer", rate: 280 },
    ],
  },
  {
    id: "track-light",
    name: "Track Light",
    category: "lighting",
    icon: "options-outline",
    unit: "nos",
    inputMode: "count",
    defaultAmount: 4,
    tiers: [
      { key: "std", label: "Standard", rate: 55 },
      { key: "prm", label: "Magnetic track", rate: 95 },
    ],
  },

  // ── Plumbing ──────────────────────────────────────────────────────────────
  {
    id: "toilet-bowl",
    name: "Toilet Bowl (WC)",
    category: "plumbing",
    icon: "ellipse-outline",
    unit: "nos",
    inputMode: "count",
    defaultAmount: 1,
    tiers: [
      { key: "std", label: "Standard", rate: 320 },
      { key: "prm", label: "Rimless / smart", rate: 780 },
    ],
  },
  {
    id: "shower-set",
    name: "Shower & Mixer Set",
    category: "plumbing",
    icon: "rainy-outline",
    unit: "nos",
    inputMode: "count",
    defaultAmount: 1,
    tiers: [
      { key: "std", label: "Standard", rate: 280 },
      { key: "prm", label: "Rain shower", rate: 620 },
    ],
  },
  {
    id: "sink-mixer",
    name: "Sink & Mixer",
    category: "plumbing",
    icon: "water-outline",
    unit: "nos",
    inputMode: "count",
    defaultAmount: 1,
    tiers: [
      { key: "std", label: "Standard", rate: 240 },
      { key: "prm", label: "Pull-out designer", rate: 480 },
    ],
  },

  // ── Electrical ────────────────────────────────────────────────────────────
  {
    id: "light-point",
    name: "Lighting Point",
    category: "electrical",
    icon: "git-commit-outline",
    unit: "nos",
    inputMode: "count",
    defaultAmount: 10,
    tiers: [
      { key: "std", label: "New point", rate: 45 },
      { key: "prm", label: "Relocate + wiring", rate: 70 },
    ],
  },
  {
    id: "data-point",
    name: "Data / TV Point",
    category: "electrical",
    icon: "wifi-outline",
    unit: "nos",
    inputMode: "count",
    defaultAmount: 2,
    tiers: [
      { key: "std", label: "CAT6 / TV", rate: 85 },
      { key: "prm", label: "Fibre-ready", rate: 120 },
    ],
  },

  // ── Air-Con ───────────────────────────────────────────────────────────────
  {
    id: "aircon-system",
    name: "Air-Con System",
    category: "aircon",
    icon: "snow-outline",
    unit: "nos",
    inputMode: "count",
    defaultAmount: 1,
    tiers: [
      { key: "std", label: "System 3", rate: 2600 },
      { key: "prm", label: "System 4 inverter", rate: 3600 },
    ],
    breakdown: [
      { label: "Condenser + fan coils", qty: 1, unit: "set", rate: 1900 },
      { label: "Copper piping + trunking", qty: 1, unit: "set", rate: 500 },
      { label: "Installation + vacuum", qty: 1, unit: "set", rate: 200 },
    ],
    defaultNotes: "Supply and install inverter air-con system including piping and trunking.",
  },

  // ── Soft Furnishing ───────────────────────────────────────────────────────
  {
    id: "curtains",
    name: "Curtains",
    category: "furnishing",
    icon: "browsers-outline",
    unit: "ftrun",
    inputMode: "measure",
    defaultAmount: 20,
    tiers: [
      { key: "std", label: "Day curtain", rate: 38 },
      { key: "prm", label: "Day + night", rate: 65 },
    ],
  },
  {
    id: "blinds",
    name: "Roller Blinds",
    category: "furnishing",
    icon: "reorder-four-outline",
    unit: "nos",
    inputMode: "count",
    defaultAmount: 2,
    tiers: [
      { key: "std", label: "Dim-out", rate: 180 },
      { key: "prm", label: "Motorised", rate: 420 },
    ],
  },
];

export const UNIT_LABEL: Record<QuoteUnit, string> = {
  sqft: "sqft",
  ftrun: "ft run",
  nos: "nos",
  item: "item",
  lot: "lot",
};

export const categoryOf = (key: string) =>
  QUOTE_CATEGORIES.find((c) => c.key === key) ?? QUOTE_CATEGORIES[0];

/** Look up a seed template by id (custom templates are resolved separately). */
export const getTemplateById = (id: string): QuoteItemTemplate | undefined =>
  SEED_TEMPLATES.find((t) => t.id === id);

/* -------------------------------------------------------------------------- */
/*  Room scaffolding                                                          */
/*                                                                            */
/*  Maps a floor-plan room type → the line items it typically needs, and how  */
/*  to size each from the room's area. Powers (a) the builder's one-tap       */
/*  "auto-scaffold" and (b) grounding for the AI design→quote suggestion.     */
/* -------------------------------------------------------------------------- */

/** Floor-plan room types (mirror of backend `RoomType`). */
export type RoomType =
  | "bedroom" | "living" | "dining" | "kitchen" | "bathroom"
  | "utility" | "outdoor" | "circulation" | "other";

/** How to derive a quantity for a scaffolded item from the room's sqft. */
export type QtyMode =
  | { kind: "area" }                 // use the room area directly (sqft items)
  | { kind: "perimeter" }            // estimate wall run from area (ft-run items)
  | { kind: "fixed"; value: number }; // a flat count (nos / lot items)

export interface RoomScaffoldItem {
  templateId: string;
  qty: QtyMode;
}

/**
 * Estimate a room's wall perimeter (ft) from its floor area (sqft), assuming a
 * roughly square room: perimeter ≈ 4 · √area. Clamped to a sane minimum.
 */
export function estimatePerimeter(sqft: number): number {
  return Math.max(8, Math.round(4 * Math.sqrt(Math.max(0, sqft))));
}

/** Resolve a QtyMode + room area into a concrete starting quantity. */
export function quantityFor(qty: QtyMode, roomSqft: number | null): number {
  const area = roomSqft && roomSqft > 0 ? roomSqft : 100;
  switch (qty.kind) {
    case "area": return Math.round(area);
    case "perimeter": return estimatePerimeter(area);
    case "fixed": return qty.value;
  }
}

export const ROOM_SUGGESTIONS: Record<RoomType, RoomScaffoldItem[]> = {
  living: [
    { templateId: "vinyl-flooring", qty: { kind: "area" } },
    { templateId: "skirting", qty: { kind: "perimeter" } },
    { templateId: "false-ceiling", qty: { kind: "perimeter" } },
    { templateId: "tv-console", qty: { kind: "fixed", value: 10 } },
    { templateId: "painting", qty: { kind: "area" } },
    { templateId: "downlight", qty: { kind: "fixed", value: 8 } },
    { templateId: "aircon-system", qty: { kind: "fixed", value: 1 } },
    { templateId: "curtains", qty: { kind: "fixed", value: 16 } },
  ],
  dining: [
    { templateId: "vinyl-flooring", qty: { kind: "area" } },
    { templateId: "feature-wall", qty: { kind: "fixed", value: 30 } },
    { templateId: "pendant-light", qty: { kind: "fixed", value: 1 } },
    { templateId: "painting", qty: { kind: "area" } },
  ],
  kitchen: [
    { templateId: "tile-flooring", qty: { kind: "area" } },
    { templateId: "kitchen-cabinet", qty: { kind: "perimeter" } },
    { templateId: "kitchen-top", qty: { kind: "perimeter" } },
    { templateId: "sink-mixer", qty: { kind: "fixed", value: 1 } },
    { templateId: "waterproofing", qty: { kind: "area" } },
    { templateId: "power-point", qty: { kind: "fixed", value: 6 } },
  ],
  bedroom: [
    { templateId: "vinyl-flooring", qty: { kind: "area" } },
    { templateId: "skirting", qty: { kind: "perimeter" } },
    { templateId: "wardrobe", qty: { kind: "perimeter" } },
    { templateId: "false-ceiling", qty: { kind: "perimeter" } },
    { templateId: "painting", qty: { kind: "area" } },
    { templateId: "downlight", qty: { kind: "fixed", value: 4 } },
    { templateId: "aircon-system", qty: { kind: "fixed", value: 1 } },
    { templateId: "curtains", qty: { kind: "fixed", value: 10 } },
  ],
  bathroom: [
    { templateId: "tile-flooring", qty: { kind: "area" } },
    { templateId: "waterproofing", qty: { kind: "area" } },
    { templateId: "toilet-bowl", qty: { kind: "fixed", value: 1 } },
    { templateId: "shower-set", qty: { kind: "fixed", value: 1 } },
    { templateId: "vanity", qty: { kind: "fixed", value: 1 } },
    { templateId: "shower-screen", qty: { kind: "fixed", value: 1 } },
  ],
  utility: [
    { templateId: "tile-flooring", qty: { kind: "area" } },
    { templateId: "waterproofing", qty: { kind: "area" } },
    { templateId: "power-point", qty: { kind: "fixed", value: 2 } },
  ],
  outdoor: [
    { templateId: "tile-flooring", qty: { kind: "area" } },
    { templateId: "power-point", qty: { kind: "fixed", value: 1 } },
  ],
  circulation: [
    { templateId: "vinyl-flooring", qty: { kind: "area" } },
    { templateId: "skirting", qty: { kind: "perimeter" } },
    { templateId: "downlight", qty: { kind: "fixed", value: 4 } },
  ],
  other: [
    { templateId: "painting", qty: { kind: "area" } },
    { templateId: "downlight", qty: { kind: "fixed", value: 2 } },
  ],
};

/** Heuristic: map a free-text room name to a RoomType for scaffolding. */
export function roomTypeFromName(name: string): RoomType {
  const n = name.toLowerCase();
  if (/(master|bed|room\s*\d|guest)/.test(n)) return "bedroom";
  if (/(living|lounge|hall|tv)/.test(n)) return "living";
  if (/(dining|dinner)/.test(n)) return "dining";
  if (/(kitchen|wet\s*kitchen|dry\s*kitchen|pantry)/.test(n)) return "kitchen";
  if (/(bath|toilet|wc|washroom|powder|shower|ensuite|en-suite)/.test(n)) return "bathroom";
  if (/(utility|store|yard|laundry|service)/.test(n)) return "utility";
  if (/(balcony|patio|outdoor|terrace|garden|pes)/.test(n)) return "outdoor";
  if (/(corridor|foyer|entrance|hallway|passage|landing)/.test(n)) return "circulation";
  return "other";
}
