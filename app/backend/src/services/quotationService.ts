import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "../lib/supabase";
import { QuoteLineItem, Quotation, FloorPlanAnalysis } from "../types";

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

// ─── AI: suggest a quotation from a generated design ──────────────────────────
//
// Given a design session (floor-plan rooms + areas + chosen style) and the
// designer's own item library, Claude proposes which library items each room
// needs and a starting quantity. It ONLY references real library ids/tiers —
// rates are never invented; the frontend resolves ids back to its library and
// computes the line totals. This is the "quote the rendered design" layer.

export interface LibraryItemForAI {
  id: string;
  name: string;
  category: string;
  unit: string;
  tiers: { key: string; label: string; rate: number }[];
}

export interface QuoteSuggestion {
  template_id: string;
  tier_key: string;
  room: string;
  quantity: number;
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function suggestQuoteFromDesign(
  designerId: string,
  sessionId: string,
  library: LibraryItemForAI[]
): Promise<{ suggestions: QuoteSuggestion[]; rooms: string[]; total_sqft: number | null; style: string | null }> {
  // 1. Load the session (must belong to this designer)
  const { data: session, error } = await supabaseAdmin
    .from("design_sessions")
    .select("floor_plan_analysis, design_style_id, selected_rooms, total_sqft")
    .eq("id", sessionId)
    .eq("designer_id", designerId)
    .single();

  if (error || !session?.floor_plan_analysis) {
    throw new Error("Design session not found or has no floor-plan analysis");
  }

  const analysis = session.floor_plan_analysis as FloorPlanAnalysis;
  const selected: string[] = Array.isArray(session.selected_rooms) ? session.selected_rooms : [];

  // Scope to the rooms the designer chose to render (fall back to all rooms).
  const rooms = (analysis.rooms ?? []).filter(
    (r) => selected.length === 0 || selected.includes(r.name)
  );
  if (rooms.length === 0) throw new Error("No rooms available to quote");

  // 2. Build a compact, grounded prompt. The model may ONLY use these ids.
  const libraryText = library
    .map(
      (it) =>
        `- ${it.id} | "${it.name}" | ${it.category} | per ${it.unit} | tiers: ${it.tiers
          .map((t) => `${t.key}=${t.label} ($${t.rate}/${it.unit})`)
          .join(", ")}`
    )
    .join("\n");

  const roomsText = rooms
    .map((r) => `- "${r.name}" | type: ${r.type} | ~${r.estimated_sqft ?? "?"} sqft${r.is_wet_area ? " | wet area" : ""}`)
    .join("\n");

  const validIds = new Set(library.map((l) => l.id));
  const tierKeysById = new Map(library.map((l) => [l.id, new Set(l.tiers.map((t) => t.key))]));

  const system = `You are a senior Singapore interior designer preparing an itemised renovation quotation from a floor plan and a chosen design style. You will be given the designer's item LIBRARY and the project's ROOMS. For each room, select the library items that room realistically needs and give a sensible starting quantity.

STRICT RULES:
- Only use template_id values that appear in the LIBRARY. Never invent items or ids.
- tier_key must be one of that item's listed tier keys. Prefer a mid/standard tier unless the style implies luxury.
- quantity is a number in the item's unit. For "sqft" items use roughly the room's area; for "ftrun" (running feet) estimate wall/cabinet run (a square room of A sqft has perimeter ~4·sqrt(A)); for "nos"/"lot" use a realistic count.
- room must be one of the exact room names provided.
- Be practical and complete but do not pad: a bedroom needs flooring, wardrobe, ceiling, paint, lights, aircon; a kitchen needs tiling, cabinetry, worktop, sink, waterproofing; a bathroom needs tiling, waterproofing, WC, shower, vanity. Skip items a room clearly doesn't need.
- Output ONLY a JSON object, no markdown fences, of the form:
{"suggestions":[{"template_id":"...","tier_key":"...","room":"...","quantity":0}]}`;

  const user = `STYLE: ${session.design_style_id ?? "unspecified"}
TOTAL AREA: ${session.total_sqft ?? analysis.total_estimated_sqft ?? "unknown"} sqft

ROOMS:
${roomsText}

LIBRARY (choose only from these ids):
${libraryText}

Return the JSON now.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system,
    messages: [{ role: "user", content: user }],
  });

  const raw = response.content[0]?.type === "text" ? response.content[0].text : "";
  const text = raw.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "").trim();

  let parsed: { suggestions?: QuoteSuggestion[] };
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`AI returned invalid JSON: ${raw.slice(0, 160)}`);
  }

  const roomNames = new Set(rooms.map((r) => r.name));

  // 3. Validate every suggestion against the real library + rooms; drop bad rows.
  const suggestions = (parsed.suggestions ?? []).filter((s) => {
    if (!s || typeof s.template_id !== "string") return false;
    if (!validIds.has(s.template_id)) return false;
    if (!tierKeysById.get(s.template_id)?.has(s.tier_key)) return false;
    if (!roomNames.has(s.room)) return false;
    return Number(s.quantity) > 0;
  }).map((s) => ({ ...s, quantity: Math.round(Number(s.quantity)) }));

  if (suggestions.length === 0) {
    throw new Error("AI produced no valid line items for this design");
  }

  return {
    suggestions,
    rooms: rooms.map((r) => r.name),
    total_sqft: session.total_sqft ?? analysis.total_estimated_sqft ?? null,
    style: session.design_style_id ?? null,
  };
}
