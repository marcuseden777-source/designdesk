export type RoomType = "bedroom" | "living" | "dining" | "kitchen" | "bathroom" | "utility" | "outdoor" | "circulation" | "other";

export interface Room {
  name: string;
  type: RoomType;
  estimated_sqft: number | null;
  is_wet_area: boolean;
  notes: string | null;
}

export interface FloorPlanAnalysis {
  layout_type: string;
  total_estimated_sqft: number | null;
  rooms: Room[];
  wet_areas: string[];
  structural_features: string[];
  confidence: "high" | "medium" | "low";
  flags: string[];
  // Optional editable geometry, extracted by extractFloorPlanGeometry(). Nested
  // here so it rides along in the design_sessions.floor_plan_analysis JSONB with
  // no schema migration; the 3D editor reads it to seed a scene.
  geometry?: FloorPlanGeometry;
}

// Room as a metric polygon: [x, y] vertices in METRES, top-left origin (x→right,
// y→down, matching image orientation). The editor maps [x, y] → Pascal [x, z].
export interface GeometryRoom {
  name: string;
  type: RoomType;
  polygon: [number, number][];
  is_wet_area: boolean;
}

// Vision-extracted floor-plan geometry. Coordinates are approximate (single-shot
// vision) — the point is an editable draft, corrected in the 3D Studio.
export interface FloorPlanGeometry {
  units: "meters";
  plan_width_m: number;
  plan_height_m: number;
  scale_source: "dimensions" | "scale_bar" | "estimated";
  rooms: GeometryRoom[];
  notes: string[];
}

export interface DesignStyle {
  id: string;
  name: string;
  description: string;
  colors: string[];
  materials: string[];
  forbidden_colors?: string[];
}

export interface QuoteLineItem {
  item_id: number;
  item_name: string;
  category: string;
  room: string | null;
  quantity: number;
  unit: string;
  unit_rate: number;
  total_amount: number;
  selected_tier: string;
  notes?: string;
}

export interface Quotation {
  id: string;
  designer_id: string;
  client_name: string;
  project_address: string;
  project_type: string;
  total_sqft: number;
  rooms: string[];
  line_items: QuoteLineItem[];
  subtotal: number;
  gst_amount: number;
  grand_total: number;
  status: "draft" | "sent" | "accepted" | "rejected";
  created_at: string;
}
