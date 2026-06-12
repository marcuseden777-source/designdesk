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

export type GenerateDesignInput = z.infer<typeof GenerateDesignSchema>;
export type CreateQuotationInput = z.infer<typeof CreateQuotationSchema>;
