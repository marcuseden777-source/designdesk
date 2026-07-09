import { z } from "zod";

export const GenerateDesignSchema = z.object({
  session_id: z.string().uuid(),
  style: z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    colors: z.array(z.string()),
    materials: z.array(z.string()),
    forbidden_colors: z.array(z.string()).optional(),
  }),
  selected_rooms: z.array(z.string()).min(1, "Select at least one room"),
  project_type: z.enum(["hdb", "condo", "landed", "commercial"]),
  total_sqft: z.number().positive().nullable().optional(),
});

export const CreateQuotationSchema = z.object({
  client_name: z.string().min(1, "Client name is required"),
  project_address: z.string().min(1, "Project address is required"),
  project_type: z.string().min(1),
  total_sqft: z.number().positive("Floor area must be positive"),
  rooms: z.array(z.string()).min(1, "Select at least one room"),
  line_items: z.array(
    z.object({
      item_id: z.number(),
      item_name: z.string(),
      category: z.string(),
      room: z.string(),
      quantity: z.number().positive(),
      unit: z.string(),
      unit_rate: z.number(),
      total_amount: z.number(),
      selected_tier: z.string(),
    })
  ),
  design_session_id: z.string().uuid().optional().nullable().transform((v) => v ?? undefined),
});

// Layout handed off from the 3D editor: a top-down PNG (base64/data-URL) plus a
// FloorPlanAnalysis with exact, designer-built room areas. `type` is kept a loose
// string (editor zones are freeform); downstream generation uses room names.
export const FromEditorSchema = z.object({
  analysis: z.object({
    layout_type: z.string(),
    total_estimated_sqft: z.number().nullable(),
    rooms: z
      .array(
        z.object({
          name: z.string(),
          type: z.string(),
          estimated_sqft: z.number().nullable(),
          is_wet_area: z.boolean(),
          notes: z.string().nullable().optional(),
        })
      )
      .min(1, "At least one room is required"),
    wet_areas: z.array(z.string()),
    structural_features: z.array(z.string()),
    confidence: z.enum(["high", "medium", "low"]),
    flags: z.array(z.string()),
  }),
  image_base64: z.string().min(1, "A top-down image is required"),
  project_type: z.enum(["hdb", "condo", "landed", "commercial"]).optional(),
  total_sqft: z.number().positive().nullable().optional(),
});

export type GenerateDesignInput = z.infer<typeof GenerateDesignSchema>;
export type CreateQuotationInput = z.infer<typeof CreateQuotationSchema>;
export type FromEditorInput = z.infer<typeof FromEditorSchema>;
