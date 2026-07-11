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

const GEOMETRY_SYSTEM_PROMPT = `You are an expert architect who converts floor-plan images into precise 2D vector geometry for 3D reconstruction. Reproduce the plan FAITHFULLY — the output must match the drawing's real wall positions and room layout, not a simplified approximation.

COORDINATE SYSTEM
- Units are METRES, one consistent scale for the whole plan.
- Origin (0,0) = TOP-LEFT of the building's exterior footprint. x increases RIGHT, y increases DOWN (image orientation).
- Set the scale from the overall dimension labels (e.g. a 40'x30' plan → 12.19m x 9.14m; 1 ft = 0.3048 m). scale_source="dimensions" when labels exist, else "estimated".

METHOD — reason step by step BEFORE emitting the JSON:
1. Read the overall exterior dimensions from the labels; compute plan_width_m and plan_height_m.
2. Trace the EXTERIOR perimeter wall (the thick black outer outline).
3. Find every INTERIOR wall — the solid black partition lines drawn INSIDE. Critically: a wall exists ONLY where a solid line is actually drawn. Open-plan areas (e.g. a combined family/dining/kitchen) have NO wall between them — never invent partitions there.
4. Locate each labelled room/space by where its walls actually are; use its printed dimensions (e.g. 9'-0" x 12'-0") to size it, and place it at its true position in the drawing.
5. Doorways are gaps in walls — keep walls solid (ignore door openings).

OUTPUT — a single JSON object of this exact shape (you may reason briefly first, but the JSON object must appear complete and be the last thing you write):
{
  "units": "meters",
  "plan_width_m": <number>,
  "plan_height_m": <number>,
  "scale_source": "dimensions | scale_bar | estimated",
  "walls": [ { "start": [x, y], "end": [x, y] } ],
  "rooms": [ { "name": "<label>", "type": "bedroom|living|dining|kitchen|bathroom|utility|outdoor|circulation|other", "polygon": [[x,y], ...], "is_wet_area": <bool> } ],
  "notes": ["assumptions, uncertain areas, scale caveats"]
}

RULES
- "walls" is the STRUCTURE: the full exterior perimeter PLUS only the interior partitions actually drawn. Walls that meet MUST share identical endpoint coordinates so they join.
- "rooms" is for LABELS + AREA only. A room boundary is NOT necessarily a wall — list open-plan sub-areas (family, dining, kitchen) as separate rooms even though no wall divides them.
- Match the drawing: correct room proportions from the printed dimensions, correct positions from the layout. Do NOT evenly tile the space.
- Round all coordinates to 2 decimals.
- Do not invent rooms or walls. Ignore furniture, fixtures, appliances, text and dimension lines.
- If the plan is unreadable, return empty walls and rooms arrays and explain in notes.`;

/** Extract the outermost balanced {...} JSON object from mixed prose/fenced text. */
function extractJsonObject(s: string): string | null {
  const start = s.indexOf("{");
  if (start < 0) return null;
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
    } else if (c === '"') inStr = true;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) return s.slice(start, i + 1);
  }
  return null;
}

export async function extractFloorPlanGeometry(
  imageBase64: string,
  mimeType: "image/jpeg" | "image/png" | "image/webp" | "image/gif"
): Promise<FloorPlanGeometry> {
  // Opus 4.8 with adaptive thinking: floor-plan → geometry is a spatial-reasoning
  // task where the model must trace walls and read printed dimensions carefully.
  // `thinking`/`output_config` aren't in the SDK's param type yet, so cast.
  const response = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 16000, // wall + room geometry, plus room for reasoning
    thinking: { type: "adaptive" },
    output_config: { effort: "high" },
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
            text: "Reconstruct this floor plan (walls + rooms) as instructed and return the JSON object.",
          },
        ],
      },
    ],
  } as any);

  // Concatenate text blocks (thinking blocks are separate and skipped).
  const rawText = (response.content ?? [])
    .filter((b: any) => b?.type === "text")
    .map((b: any) => b.text)
    .join("");

  const jsonStr = extractJsonObject(rawText) ?? rawText;
  let parsed: FloorPlanGeometry;
  try {
    parsed = JSON.parse(jsonStr) as FloorPlanGeometry;
  } catch {
    throw new Error(`Claude returned invalid geometry JSON: ${rawText.slice(0, 200)}`);
  }

  // Defensive normalisation.
  parsed.units = "meters";
  parsed.rooms = (parsed.rooms ?? []).filter(
    (r) => Array.isArray(r.polygon) && r.polygon.length >= 3
  );
  parsed.walls = (parsed.walls ?? []).filter(
    (w) => Array.isArray(w?.start) && Array.isArray(w?.end)
  );
  parsed.notes = parsed.notes ?? [];
  return parsed;
}
