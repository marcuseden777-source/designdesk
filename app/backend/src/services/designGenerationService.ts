import { FloorPlanAnalysis, DesignStyle } from "../types";

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY!;
const NVIDIA_FLUX_URL = "https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-dev";

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

  const response = await fetch(NVIDIA_FLUX_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${NVIDIA_API_KEY}`,
    },
    body: JSON.stringify({
      prompt,
      height: 1024,
      width: 1024,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Nvidia API error (${response.status}): ${err}`);
  }

  const data = (await response.json()) as { artifacts?: { base64: string }[] };
  const b64 = data.artifacts?.[0]?.base64;
  if (!b64) throw new Error("Nvidia returned no image data");

  return `data:image/jpeg;base64,${b64}`;
}
