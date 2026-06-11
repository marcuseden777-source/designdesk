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
