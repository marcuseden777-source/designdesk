import OpenAI from "openai";
import { FloorPlanAnalysis, DesignStyle } from "../types";

// Nvidia NIM API is OpenAI-compatible — same SDK, different base URL + model
const openai = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY,
  baseURL: "https://integrate.api.nvidia.com/v1",
});

function buildDesignPrompt(
  analysis: FloorPlanAnalysis,
  style: DesignStyle,
  selectedRooms: string[],
  projectType: string,
  totalSqft: number | null
): string {
  const roomList = analysis.rooms
    .filter((r) => selectedRooms.includes(r.name))
    .map((r) => `${r.name} (~${r.estimated_sqft ?? "unknown"} sqft)`)
    .join(", ");

  const sqftNote = totalSqft ? `Total area: ${totalSqft} sqft.` : "";

  return `Create a photorealistic top-view (bird's eye view, floor plan perspective) interior design rendering for a Singapore ${projectType} unit.

Design style: ${style.name}
Color palette: ${style.colors.join(", ")}
Key materials: ${style.materials.join(", ")}
Mood: ${style.description}

Rooms to show: ${roomList}
${sqftNote}

Layout type: ${analysis.layout_type}

Requirements:
- Strict top-down 90-degree overhead view (not perspective, not isometric)
- Show furniture placement, rugs, and fixtures rendered in the ${style.name} style
- Use ONLY the specified color palette: ${style.colors.join(", ")}
- Do NOT use these forbidden colors: ${style.forbidden_colors?.join(", ") ?? "none"}
- Walls shown as thin outlines, rooms filled with styled flooring and furniture
- Clean, professional architectural rendering quality
- No text, labels, or dimension annotations in the image
- Singapore residential scale and proportions`;
}

export async function generateDesign(
  analysis: FloorPlanAnalysis,
  style: DesignStyle,
  selectedRooms: string[],
  projectType: string,
  totalSqft: number | null
): Promise<string> {
  const prompt = buildDesignPrompt(
    analysis,
    style,
    selectedRooms,
    projectType,
    totalSqft
  );

  const response = await openai.images.generate({
    model: "black-forest-labs/flux.1-dev",
    prompt,
    n: 1,
    response_format: "b64_json",
  } as any); // Nvidia NIM accepts extra params not in OpenAI's type defs

  const b64 = response.data[0]?.b64_json;
  if (!b64) throw new Error("Nvidia returned no image data");

  // Return as data URI — mobile app renders this directly
  // Replace with S3 upload once AWS credentials are configured
  return `data:image/png;base64,${b64}`;
}
