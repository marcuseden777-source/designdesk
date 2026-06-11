// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface Designer {
  id: string;
  email: string;
  full_name: string;
  subscription_tier: "free" | "pro" | "agency";
  created_at: string;
}

// ─── Floor Plan ───────────────────────────────────────────────────────────────

export type RoomType =
  | "bedroom"
  | "living"
  | "dining"
  | "kitchen"
  | "bathroom"
  | "utility"
  | "outdoor"
  | "circulation"
  | "other";

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
}

// ─── Design Session ───────────────────────────────────────────────────────────

export type ProjectType = "hdb" | "condo" | "landed" | "commercial";
export type ProjectGoal =
  | "full_reno"
  | "partial_reno"
  | "design_concept"
  | "quotation_only";

export interface DesignSession {
  id: string;
  floor_plan_url: string | null;
  floor_plan_analysis: FloorPlanAnalysis | null;
  selected_rooms: string[];
  project_type: ProjectType | null;
  total_sqft: number | null;
  design_style_id: string | null;
  generated_design_url: string | null;
  created_at: string;
}

// ─── Quotation ────────────────────────────────────────────────────────────────

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
}

export interface Quotation {
  id: string;
  client_name: string;
  project_address: string;
  project_type: ProjectType;
  total_sqft: number;
  rooms: string[];
  line_items: QuoteLineItem[];
  subtotal: number;
  gst_amount: number;
  grand_total: number;
  status: "draft" | "sent" | "accepted" | "rejected";
  created_at: string;
}
