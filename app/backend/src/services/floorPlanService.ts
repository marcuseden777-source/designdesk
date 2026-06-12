import Anthropic from "@anthropic-ai/sdk";
import { FloorPlanAnalysis } from "../types";

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
