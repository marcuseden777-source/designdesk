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
  { key: "lighting", label: "Lighting", icon: "bulb-outline", tint: "#c9962f" },
  { key: "painting", label: "Painting", icon: "color-palette-outline", tint: "#6a7f6a" },
  { key: "plumbing", label: "Plumbing", icon: "water-outline", tint: "#4a7f8f" },
  { key: "electrical", label: "Electrical", icon: "flash-outline", tint: "#9a6f3a" },
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
