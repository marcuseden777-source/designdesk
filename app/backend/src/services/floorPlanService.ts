import Anthropic from "@anthropic-ai/sdk";
import { FloorPlanAnalysis, FloorPlanGeometry } from "../types";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are an expert interior design AI assistant specialised in reading and
interpreting residential and commercial floor plans.

When given a floor plan image, you must:

1. IDENTIFY all rooms and spaces visible in the floor plan.
2. ESTIMATE the approximate size of each room if scale indicators or dimensions are visible.
3. IDENTIFY the overall layout type (open plan, compartmentalised, L-shaped, etc.)
4. NOTE structural and wet area features (columns, beams, bathrooms, kitchen, yard).
5. FLAG anything unclear or unidentifiable.

OUTPUT FORMAT: Return a clean JSON object only. No preamble, no explanation outside the JSON.

{
  "layout_type": "string",
  "total_estimated_sqft": number or null,
  "rooms": [
    {
      "name": "string",
      "type": "bedroom | living | dining | kitchen | bathroom | utility | outdoor | circulation | other",
      "estimated_sqft": number or null,
      "is_wet_area": boolean,
      "notes": "string or null"
    }
  ],
  "wet_areas": ["list of room names that are wet areas"],
  "structural_features": ["list of notable structural elements"],
  "confidence": "high | medium | low",
  "flags": ["list of any issues or uncertainties found"]
}

RULES:
- Never guess a room type if not clearly identifiable — use "other"
- Never fabricate dimensions — set to null if not determinable
- Always output valid JSON with no markdown code fences`;

export async function analyzeFloorPlan(
  imageBase64: string,
  mimeType: "image/jpeg" | "image/png" | "image/webp" | "image/gif"
): Promise<FloorPlanAnalysis> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mimeType, data: imageBase64 },
          },
          {
            type: "text",
            text: "Analyse this floor plan and return the JSON as instructed.",
          },
        ],
      },
    ],
  });

  const rawText = response.content[0].type === "text" ? response.content[0].text : "";

  // Strip markdown code fences if Claude wraps JSON in ```json ... ```
  const text = rawText.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "").trim();

  try {
    return JSON.parse(text) as FloorPlanAnalysis;
  } catch {
    throw new Error(`Claude returned invalid JSON: ${rawText.slice(0, 200)}`);
  }
}

const GEOMETRY_SYSTEM_PROMPT = `You are an expert at reading architectural floor plans and converting them into
precise 2D vector geometry. Given a floor-plan image, reconstruct each room as a
metric polygon so it can be rebuilt as an editable 3D model.

COORDINATE SYSTEM (follow exactly):
- Units are METRES. Use ONE consistent scale for the whole plan.
- Origin (0,0) is the TOP-LEFT of the plan. x increases to the RIGHT, y increases DOWNWARD (image orientation).
- Every room is a closed polygon: an ordered array of [x, y] vertices in metres. Do NOT repeat the first vertex at the end.

SCALE:
- If printed dimensions or a scale bar are visible, use them and set scale_source to "dimensions" or "scale_bar".
- Otherwise estimate a realistic scale from typical residential sizes (a single bedroom ≈ 3–4 m per side, a full bathroom ≈ 1.5–2.5 m, interior doors ≈ 0.8–0.9 m wide) and set scale_source to "estimated".
- plan_width_m and plan_height_m are the real-world width and height the whole drawing spans, in metres.

ACCURACY RULES (critical for a clean 3D result):
- Where two rooms share a wall, they MUST share the exact same coordinates along that shared edge (identical numbers), so the walls line up.
- Keep walls axis-aligned (horizontal/vertical) unless the plan is clearly angled.
- Prefer simple rectangles for rectangular rooms. Only use extra vertices for genuinely L-shaped or irregular rooms.
- Round coordinates to 2 decimal places.
- Include every enclosed room/space with a label or clear boundary. Ignore furniture, text, and dimension lines.

OUTPUT FORMAT: Return a clean JSON object only. No preamble, no markdown fences.

{
  "units": "meters",
  "plan_width_m": number,
  "plan_height_m": number,
  "scale_source": "dimensions | scale_bar | estimated",
  "rooms": [
    {
      "name": "string",
      "type": "bedroom | living | dining | kitchen | bathroom | utility | outdoor | circulation | other",
      "polygon": [[x, y], [x, y], ...],
      "is_wet_area": boolean
    }
  ],
  "notes": ["any assumptions, uncertain areas, or scale caveats"]
}

RULES:
- Always output valid JSON with no markdown code fences.
- Never invent rooms that are not present. If the plan is unreadable, return an empty rooms array and explain in notes.
- Use "other" when a room type is unclear.`;

export async function extractFloorPlanGeometry(
  imageBase64: string,
  mimeType: "image/jpeg" | "image/png" | "image/webp" | "image/gif"
): Promise<FloorPlanGeometry> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8192, // geometry (polygons per room) is far larger than the semantic analysis
    system: GEOMETRY_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mimeType, data: imageBase64 },
          },
          {
            type: "text",
            text: "Reconstruct this floor plan as metric room polygons and return the JSON as instructed.",
          },
        ],
      },
    ],
  });

  const rawText = response.content[0].type === "text" ? response.content[0].text : "";
  const text = rawText.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "").trim();

  let parsed: FloorPlanGeometry;
  try {
    parsed = JSON.parse(text) as FloorPlanGeometry;
  } catch {
    throw new Error(`Claude returned invalid geometry JSON: ${rawText.slice(0, 200)}`);
  }

  // Defensive normalisation — keep only well-formed rooms with a real polygon.
  parsed.units = "meters";
  parsed.rooms = (parsed.rooms ?? []).filter(
    (r) => Array.isArray(r.polygon) && r.polygon.length >= 3
  );
  parsed.notes = parsed.notes ?? [];
  return parsed;
}
