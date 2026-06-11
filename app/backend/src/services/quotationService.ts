import { supabaseAdmin } from "../lib/supabase";
import { QuoteLineItem, Quotation } from "../types";

// ─── Fetch all pricing data from Supabase ─────────────────────────────────────

export async function getCategoriesWithItems() {
  const { data, error } = await supabaseAdmin
    .from("categories")
    .select(`
      id,
      name,
      sort_order,
      items (
        id,
        name,
        description,
        unit,
        applicability,
        price_tiers (
          tier_name,
          min_rate,
          low_rate,
          high_rate,
          currency,
          notes
        )
      )
    `)
    .eq("active", true)
    .order("sort_order");

  if (error) throw error;
  return data;
}

// ─── Save a quotation draft ───────────────────────────────────────────────────

export async function createQuotation(
  designerId: string,
  payload: {
    client_name: string;
    project_address: string;
    project_type: string;
    total_sqft: number;
    rooms: string[];
    line_items: QuoteLineItem[];
    design_session_id?: string;
  }
): Promise<Quotation> {
  const subtotal = payload.line_items.reduce((sum, i) => sum + i.total_amount, 0);
  const gst_amount = Math.round(subtotal * 0.09 * 100) / 100; // Singapore 9% GST
  const grand_total = Math.round((subtotal + gst_amount) * 100) / 100;

  const { data, error } = await supabaseAdmin
    .from("quotations")
    .insert({
      designer_id: designerId,
      client_name: payload.client_name,
      project_address: payload.project_address,
      project_type: payload.project_type,
      total_sqft: payload.total_sqft,
      rooms: payload.rooms,
      subtotal,
      gst_amount,
      grand_total,
      status: "draft",
      design_session_id: payload.design_session_id ?? null,
    })
    .select()
    .single();

  if (error) throw error;

  // Insert line items
  const lineItemRows = payload.line_items.map((item) => ({
    quote_id: data.id,
    item_id: item.item_id,
    quantity: item.quantity,
    unit_rate: item.unit_rate,
    total_amount: item.total_amount,
    selected_tier: item.selected_tier,
    notes: item.notes ?? null,
    room: item.room ?? null,
  }));

  const { error: lineError } = await supabaseAdmin
    .from("quote_line_items")
    .insert(lineItemRows);

  if (lineError) throw lineError;

  return { ...data, line_items: payload.line_items };
}

// ─── Get a single quotation with line items ───────────────────────────────────

export async function getQuotation(
  quoteId: string,
  designerId: string
): Promise<Quotation> {
  const { data, error } = await supabaseAdmin
    .from("quotations")
    .select(`
      *,
      quote_line_items (
        *,
        items ( name, unit, categories ( name ) )
      )
    `)
    .eq("id", quoteId)
    .eq("designer_id", designerId)
    .single();

  if (error) throw error;
  return data;
}

// ─── List all quotations for a designer ──────────────────────────────────────

export async function listQuotations(designerId: string) {
  const { data, error } = await supabaseAdmin
    .from("quotations")
    .select("id, client_name, project_address, project_type, grand_total, status, created_at")
    .eq("designer_id", designerId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}
