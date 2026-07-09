// Mirrors the backend FromEditorSchema / DesignDesk FloorPlanAnalysis contract.
// Editor zones are freeform, so `type` is a loose string.

export interface Room {
  name: string;
  type: string;
  estimated_sqft: number | null;
  is_wet_area: boolean;
  notes?: string | null;
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

export interface FromEditorPayload {
  analysis: FloorPlanAnalysis;
  image_base64: string;
  project_type?: "hdb" | "condo" | "landed" | "commercial";
  total_sqft?: number | null;
}
