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

// ─── Update quotation (draft only) ──────────────────────────────────────────

export async function updateQuotation(
  quoteId: string,
  designerId: string,
  payload: {
    client_name: string;
    project_address: string;
    project_type: string;
    total_sqft: number;
    rooms: string[];
    line_items: QuoteLineItem[];
  }
): Promise<Quotation> {
  // Verify ownership and draft status
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from("quotations")
    .select("status")
    .eq("id", quoteId)
    .eq("designer_id", designerId)
    .single();

  if (fetchError || !existing) throw new Error("Quotation not found");
  if (existing.status !== "draft") throw new Error("Only draft quotations can be edited");

  const subtotal = payload.line_items.reduce((sum, i) => sum + i.total_amount, 0);
  const gst_amount = Math.round(subtotal * 0.09 * 100) / 100;
  const grand_total = Math.round((subtotal + gst_amount) * 100) / 100;

  // Update the quotation header
  const { error: updateError } = await supabaseAdmin
    .from("quotations")
    .update({
      client_name: payload.client_name,
      project_address: payload.project_address,
      project_type: payload.project_type,
      total_sqft: payload.total_sqft,
      rooms: payload.rooms,
      subtotal,
      gst_amount,
      grand_total,
    })
    .eq("id", quoteId);

  if (updateError) throw updateError;

  // Replace all line items: delete old, insert new
  const { error: deleteError } = await supabaseAdmin
    .from("quote_line_items")
    .delete()
    .eq("quote_id", quoteId);

  if (deleteError) throw deleteError;

  const lineItemRows = payload.line_items.map((item) => ({
    quote_id: quoteId,
    item_id: item.item_id,
    quantity: item.quantity,
    unit_rate: item.unit_rate,
    total_amount: item.total_amount,
    selected_tier: item.selected_tier,
    notes: item.notes ?? null,
    room: item.room ?? null,
  }));

  const { error: insertError } = await supabaseAdmin
    .from("quote_line_items")
    .insert(lineItemRows);

  if (insertError) throw insertError;

  return getQuotation(quoteId, designerId);
}

// ─── Update quotation status ─────────────────────────────────────────────────

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ["sent"],
  sent: ["accepted", "rejected"],
  rejected: ["draft"],  // Allow re-opening rejected quotes
};

export async function updateQuotationStatus(
  quoteId: string,
  designerId: string,
  newStatus: string
): Promise<{ id: string; status: string }> {
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from("quotations")
    .select("status")
    .eq("id", quoteId)
    .eq("designer_id", designerId)
    .single();

  if (fetchError || !existing) throw new Error("Quotation not found");

  const allowed = VALID_TRANSITIONS[existing.status];
  if (!allowed?.includes(newStatus)) {
    throw new Error(`Cannot transition from "${existing.status}" to "${newStatus}"`);
  }

  const { data, error } = await supabaseAdmin
    .from("quotations")
    .update({ status: newStatus })
    .eq("id", quoteId)
    .select("id, status")
    .single();

  if (error) throw error;
  return data;
}

// ─── AI explanation for a quote line item (prose; reliable on any model) ──────
export async function explainQuoteItem(p: {
  name: string;
  category: string;
  tier: string;
  unit: string;
  amount: number;
  rate: number;
}): Promise<string> {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) throw new Error("NVIDIA_API_KEY is not configured.");

  const prompt =
    `You are an interior designer writing a client quotation. In 1–2 concise, ` +
    `professional, client-friendly sentences, explain what this line item covers ` +
    `and why it is worthwhile. No markdown, no preamble, no bullet points.\n\n` +
    `Item: ${p.name}\nCategory: ${p.category}\nTier / finish: ${p.tier}\n` +
    `Scope: ${p.amount} ${p.unit} at S$${p.rate} per ${p.unit}.`;

  const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.QUOTE_EXPLAIN_MODEL ?? "meta/llama-3.1-8b-instruct",
      max_tokens: 200,
      temperature: 0.5,
      messages: [{ role: "user", content: prompt }],
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`Explanation failed (NIM ${res.status}).`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return (data.choices?.[0]?.message?.content ?? "").trim();
}
