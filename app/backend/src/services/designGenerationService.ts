import Anthropic from "@anthropic-ai/sdk";
import Replicate from "replicate";
import { FloorPlanAnalysis, DesignStyle } from "../types";

const NVIDIA_FLUX_URL = "https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-dev";

// FLUX Kontext (image-to-image) on Replicate — restyles the uploaded floor plan
// while preserving its walls/room layout. This is the layout-preserving path;
// it falls back to Nvidia FLUX text-to-image (below) when unavailable.
const KONTEXT_MODEL = "black-forest-labs/flux-kontext-dev";

// Claude is the "design brain": it reads the structured floor-plan analysis and
// authors a vivid, layout-aware image-generation prompt for FLUX. (Anthropic
// models are text-out only — they can't render the image — so FLUX does the
// pixels while Claude does the art direction.)
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const PROMPT_MODEL = "claude-sonnet-4-6";

const PROMPT_BRAIN_SYSTEM = `You are an art director writing ONE image-generation prompt for an architectural interior-design renderer (FLUX text-to-image).

Given a floor-plan analysis and a target design style, write a single vivid prompt for a top-down (overhead) architectural rendering of THIS specific apartment layout in the given style.

Requirements:
- Reflect the ACTUAL rooms and their spatial arrangement from the analysis (relative positions / adjacencies) so the render resembles the real layout.
- Convey the style's mood, colour palette (use natural colour NAMES, never hex codes), and materials.
- Mention furniture, rugs, and fixtures appropriate to each room and the style.
- Walls as thin clean outlines; rooms filled with styled flooring and furnishings.
- Professional architectural illustration, clean and minimal. No text, no labels, no dimensions, no people, no watermarks.
- Output ONLY the prompt text: a single paragraph, no preamble, no surrounding quotes, under 150 words.`;

// For FLUX Kontext (image editing): the model receives the actual floor-plan
// image, so the instruction must tell it to RESTYLE while preserving structure.
const PROMPT_EDIT_SYSTEM = `You write ONE image-EDIT instruction for FLUX Kontext, which restyles an existing floor-plan image while preserving its structure.

Given the floor-plan analysis and a target design style, write a single instruction telling the model to restyle THIS floor plan in the given style.

Requirements:
- Begin by insisting it KEEP the exact same walls, room shapes, doors and overall layout — only change the interior styling, flooring, furniture and colours.
- Furnish each room appropriately for the style (flooring, sofas, rugs, beds, dining sets, kitchen/bath fixtures, plants).
- Convey the style's mood, colour palette (natural colour NAMES, never hex codes), and materials.
- Keep it a clean top-down architectural rendering. No text, no labels, no dimensions, no people, no watermarks.
- Output ONLY the instruction: a single paragraph, no preamble, no surrounding quotes, under 120 words.`;

// Map hex colors to natural language names for the prompt
// (Nvidia's content filter blocks hex color codes in some contexts)
const HEX_TO_NAME: Record<string, string> = {
  "#F5F0E8": "warm ivory", "#E8E0D0": "sand", "#9B8B6E": "oak brown",
  "#4A4A4A": "charcoal", "#FFFFFF": "white", "#F2EDE4": "cream",
  "#C4B49A": "warm tan", "#7A6652": "walnut brown", "#2C2C2C": "dark charcoal",
  "#E8DDD0": "beige", "#E0E0E0": "light gray", "#1C1C1E": "near black",
  "#B0B0B0": "silver", "#4A90D9": "steel blue", "#3D3D3D": "dark gray",
  "#6B6B6B": "medium gray", "#B8860B": "bronze", "#C0C0C0": "silver",
  "#2B2B2B": "graphite", "#F0EBE0": "warm white", "#8FBC8F": "sage green",
  "#A0522D": "sienna", "#2E8B57": "forest green", "#F5DEB3": "wheat",
  "#F7F7F7": "off white", "#909090": "gray", "#2D2D2D": "dark charcoal",
  "#F5ECD7": "champagne", "#8B7355": "mocha", "#4A3728": "espresso",
  "#D4AF37": "gold", "#FFFAF0": "floral white", "#1C1C1C": "black",
  "#2F4F4F": "dark slate", "#8B0000": "deep red",
};

function hexToName(hex: string): string {
  return HEX_TO_NAME[hex.toUpperCase()] ?? HEX_TO_NAME[hex] ?? "neutral";
}

// Sanitize room names to avoid content filter triggers
function sanitizeRoomName(name: string): string {
  return name
    .replace(/master\s+bed/i, "primary bed")
    .replace(/bath\s*\d*/i, "washroom")
    .replace(/\bWC\b/i, "powder room")
    .replace(/\bvoid\b/i, "open area");
}

function buildDesignPrompt(
  analysis: FloorPlanAnalysis,
  style: DesignStyle,
  selectedRooms: string[],
  projectType: string,
  totalSqft: number | null
): string {
  const roomList = analysis.rooms
    .filter((r) => selectedRooms.includes(r.name))
    .map((r) => sanitizeRoomName(r.name))
    .join(", ");

  const colorNames = style.colors.map(hexToName).join(", ");
  const sqftNote = totalSqft ? `${totalSqft} square feet` : "";

  return `Architectural floor plan rendering, top-down overhead view, ${style.name} interior design style. ${projectType} apartment${sqftNote ? `, ${sqftNote}` : ""}. Color palette: ${colorNames}. Materials: ${style.materials.join(", ")}. Mood: ${style.description}. Rooms include ${roomList}. Show furniture placement, rugs, and fixtures. Walls as thin outlines, rooms filled with styled flooring and furniture. Professional architectural illustration, clean and minimal, no text or labels.`;
}

async function callFluxApi(prompt: string): Promise<{ base64: string; filtered: boolean }> {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    throw new Error("NVIDIA_API_KEY is not configured. Set it in your environment to enable design generation.");
  }

  const response = await fetch(NVIDIA_FLUX_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
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

  const data = (await response.json()) as {
    artifacts?: { base64: string; finishReason: string }[];
  };
  const artifact = data.artifacts?.[0];
  if (!artifact?.base64) throw new Error("Nvidia returned no image data");

  return {
    base64: artifact.base64,
    filtered: artifact.finishReason === "CONTENT_FILTERED",
  };
}

// Claude (the design brain) authors a layout-aware FLUX prompt from the
// structured analysis + style. Returns null on any failure so the caller can
// fall back to the deterministic template prompt — generation must never depend
// on this step succeeding.
async function buildDesignPromptWithClaude(
  analysis: FloorPlanAnalysis,
  style: DesignStyle,
  selectedRooms: string[],
  projectType: string,
  totalSqft: number | null
): Promise<string | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  try {
    const brief = {
      project_type: projectType,
      total_sqft: totalSqft ?? analysis.total_estimated_sqft ?? null,
      layout_type: analysis.layout_type,
      rooms: analysis.rooms
        .filter((r) => selectedRooms.includes(r.name))
        .map((r) => ({
          name: sanitizeRoomName(r.name),
          type: r.type,
          estimated_sqft: r.estimated_sqft ?? null,
        })),
      style: {
        name: style.name,
        mood: style.description,
        colours: style.colors.map(hexToName),
        materials: style.materials,
      },
    };

    const res = await anthropic.messages.create({
      model: PROMPT_MODEL,
      max_tokens: 400,
      system: PROMPT_BRAIN_SYSTEM,
      messages: [
        {
          role: "user",
          content: `Floor-plan + style brief (JSON):\n${JSON.stringify(brief)}\n\nWrite the image-generation prompt.`,
        },
      ],
    });

    const text = res.content[0]?.type === "text" ? res.content[0].text.trim() : "";
    return text.length > 0 ? text : null;
  } catch (err: any) {
    console.warn("Claude prompt authoring failed, using template prompt:", err?.message);
    return null;
  }
}

export async function generateDesign(
  analysis: FloorPlanAnalysis,
  style: DesignStyle,
  selectedRooms: string[],
  projectType: string,
  totalSqft: number | null
): Promise<string> {
  // Claude authors the prompt (richer + layout-aware); fall back to the
  // deterministic template if Claude is unavailable or errors.
  const prompt =
    (await buildDesignPromptWithClaude(analysis, style, selectedRooms, projectType, totalSqft)) ??
    buildDesignPrompt(analysis, style, selectedRooms, projectType, totalSqft);

  // First attempt with full prompt
  let result = await callFluxApi(prompt);

  // If content filtered, retry with a minimal prompt
  if (result.filtered) {
    const simplePrompt = `${style.name} interior design, top-down architectural floor plan view, ${projectType} home, ${totalSqft ?? 1000} square feet. ${style.materials.slice(0, 3).join(", ")} materials. Professional rendering, clean minimal style.`;
    result = await callFluxApi(simplePrompt);
  }

  if (result.filtered) {
    throw new Error("Design generation was blocked by content safety filters. Please try a different style.");
  }

  return `data:image/jpeg;base64,${result.base64}`;
}

// ── Layout-preserving generation (FLUX Kontext img2img on Replicate) ─────────

// Claude authors the restyle EDIT instruction; falls back to a template string.
async function buildKontextInstructionWithClaude(
  analysis: FloorPlanAnalysis,
  style: DesignStyle,
  selectedRooms: string[],
  projectType: string,
  totalSqft: number | null
): Promise<string> {
  const fallback = `Keep the exact same walls, room shapes, doors and overall layout — only restyle the interior. Convert this floor plan into a ${style.name} interior design: ${style.materials.join(", ")} materials, a palette of ${style.colors.map(hexToName).join(", ")}, with furniture, rugs and fixtures suited to each room. Clean top-down architectural rendering, no text or labels.`;
  if (!process.env.ANTHROPIC_API_KEY) return fallback;
  try {
    const brief = {
      project_type: projectType,
      total_sqft: totalSqft ?? analysis.total_estimated_sqft ?? null,
      layout_type: analysis.layout_type,
      rooms: analysis.rooms
        .filter((r) => selectedRooms.includes(r.name))
        .map((r) => ({ name: sanitizeRoomName(r.name), type: r.type })),
      style: {
        name: style.name,
        mood: style.description,
        colours: style.colors.map(hexToName),
        materials: style.materials,
      },
    };
    const res = await anthropic.messages.create({
      model: PROMPT_MODEL,
      max_tokens: 350,
      system: PROMPT_EDIT_SYSTEM,
      messages: [
        {
          role: "user",
          content: `Floor-plan + style brief (JSON):\n${JSON.stringify(brief)}\n\nWrite the restyle edit instruction.`,
        },
      ],
    });
    const text = res.content[0]?.type === "text" ? res.content[0].text.trim() : "";
    return text.length > 0 ? text : fallback;
  } catch (err: any) {
    console.warn("Claude Kontext-instruction authoring failed, using template:", err?.message);
    return fallback;
  }
}

const FAL_KONTEXT_URL = "https://fal.run/fal-ai/flux-kontext/dev";

async function downloadAsDataUri(imageUrl: string): Promise<string> {
  const r = await fetch(imageUrl);
  if (!r.ok) throw new Error(`Failed to download Kontext image (${r.status})`);
  const buffer = Buffer.from(await r.arrayBuffer());
  return `data:image/jpeg;base64,${buffer.toString("base64")}`;
}

// fal.ai FLUX Kontext — image_url accepts the public Supabase floor-plan URL.
async function falKontextRestyle(floorPlanUrl: string, instruction: string): Promise<string> {
  const res = await fetch(FAL_KONTEXT_URL, {
    method: "POST",
    headers: {
      Authorization: `Key ${process.env.FAL_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: instruction,
      image_url: floorPlanUrl,
      num_inference_steps: 30,
      guidance_scale: 2.5,
      output_format: "jpeg",
    }),
  });
  if (!res.ok) {
    throw new Error(`fal Kontext error (${res.status}): ${(await res.text()).slice(0, 200)}`);
  }
  const data: any = await res.json();
  const url = data?.images?.[0]?.url;
  if (!url) throw new Error("fal Kontext returned no image");
  return downloadAsDataUri(url);
}

// Replicate FLUX Kontext — input_image accepts the public floor-plan URL.
async function replicateKontextRestyle(floorPlanUrl: string, instruction: string): Promise<string> {
  const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
  const output = await replicate.run(KONTEXT_MODEL, {
    input: {
      prompt: instruction,
      input_image: floorPlanUrl,
      aspect_ratio: "match_input_image",
      output_format: "jpg",
      num_inference_steps: 30,
    },
  });
  // replicate@1.x returns a FileOutput (or array of them); normalise to a URL.
  const first: any = Array.isArray(output) ? output[0] : output;
  const imageUrl =
    first && typeof first.url === "function" ? String(first.url()) : String(first);
  return downloadAsDataUri(imageUrl);
}

/**
 * Restyle the uploaded floor plan with FLUX Kontext (preserves layout).
 * Returns a data: URI. Dispatches to fal.ai (preferred) or Replicate depending
 * on which key is configured. Throws if neither is available or the call errors
 * — the caller falls back to text-to-image generation.
 */
export async function generateDesignWithKontext(
  floorPlanUrl: string,
  analysis: FloorPlanAnalysis,
  style: DesignStyle,
  selectedRooms: string[],
  projectType: string,
  totalSqft: number | null
): Promise<string> {
  const instruction = await buildKontextInstructionWithClaude(
    analysis,
    style,
    selectedRooms,
    projectType,
    totalSqft
  );

  if (process.env.FAL_KEY) return falKontextRestyle(floorPlanUrl, instruction);
  if (process.env.REPLICATE_API_TOKEN) return replicateKontextRestyle(floorPlanUrl, instruction);
  throw new Error("No img2img provider configured (set FAL_KEY or REPLICATE_API_TOKEN)");
}
