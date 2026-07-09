"use client";

import { useScene } from "@pascal-app/core";
import { polygonAreaSqft } from "./area";
import type { FloorPlanAnalysis, FromEditorPayload, Room } from "./types";

const API = process.env.NEXT_PUBLIC_API_URL ?? "https://designdesk.onrender.com";

// The Pascal node types are Zod-inferred; we read them structurally here to keep
// this app decoupled from the exact @pascal-app/core type exports.
type AnyNode = Record<string, any>;

function collectByType(nodes: Record<string, AnyNode>, type: string): AnyNode[] {
  return Object.values(nodes).filter((n) => n?.type === type);
}

const WET_RE = /bath|shower|wc|toilet|kitchen|utility|laundry|wet/i;

/** Build a DesignDesk FloorPlanAnalysis from the current scene's zones (rooms). */
export function sceneToAnalysis(): FloorPlanAnalysis {
  const { nodes } = useScene.getState();
  const zones = collectByType(nodes, "zone");

  const rooms: Room[] = zones.map((z) => {
    const meta = (z.metadata ?? {}) as Record<string, unknown>;
    const sqft = polygonAreaSqft((z.polygon ?? []) as [number, number][]);
    const name = (z.name as string) || "Room";
    return {
      name,
      type: (meta.type as string) || "other",
      estimated_sqft: sqft,
      is_wet_area: meta.wet === true || WET_RE.test(name),
      notes: null,
    };
  });

  const total = rooms.reduce((s, r) => s + (r.estimated_sqft ?? 0), 0);
  return {
    layout_type: "custom (editor)",
    total_estimated_sqft: total || null,
    rooms,
    wet_areas: rooms.filter((r) => r.is_wet_area).map((r) => r.name),
    structural_features: [],
    confidence: "high", // designer-built geometry → exact, not inferred
    flags: [],
  };
}

function blankPng(size: number): string {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#f5f0e8";
  ctx.fillRect(0, 0, size, size);
  return c.toDataURL("image/png");
}

/**
 * Render a clean top-down plan (zone fills + wall strokes) to a PNG data URL,
 * straight from the scene geometry — deterministic, no dependency on capturing
 * the WebGPU/WebGL canvas. This doubles as the FLUX/Kontext restyle base.
 */
export function sceneToTopDownPng(size = 1024): string {
  const { nodes } = useScene.getState();
  const zones = collectByType(nodes, "zone");
  const walls = collectByType(nodes, "wall");

  const pts: [number, number][] = [];
  zones.forEach((z) => ((z.polygon ?? []) as [number, number][]).forEach((p) => pts.push(p)));
  walls.forEach((w) => {
    if (w.start) pts.push(w.start);
    if (w.end) pts.push(w.end);
  });
  if (pts.length === 0) return blankPng(size);

  const xs = pts.map((p) => p[0]);
  const zs = pts.map((p) => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minZ = Math.min(...zs), maxZ = Math.max(...zs);
  const pad = 48;
  const spanX = Math.max(0.001, maxX - minX);
  const spanZ = Math.max(0.001, maxZ - minZ);
  const scale = Math.min((size - pad * 2) / spanX, (size - pad * 2) / spanZ);
  const tx = (x: number) => pad + (x - minX) * scale;
  const tz = (z: number) => pad + (z - minZ) * scale;

  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#f5f0e8";
  ctx.fillRect(0, 0, size, size);

  // Zone fills + labels
  zones.forEach((z) => {
    const poly = (z.polygon ?? []) as [number, number][];
    if (poly.length < 3) return;
    ctx.beginPath();
    poly.forEach((p, i) => (i === 0 ? ctx.moveTo(tx(p[0]), tz(p[1])) : ctx.lineTo(tx(p[0]), tz(p[1]))));
    ctx.closePath();
    ctx.fillStyle = ((z.color as string) ?? "#d9cdbf") + "44";
    ctx.fill();

    const cx = poly.reduce((s, p) => s + tx(p[0]), 0) / poly.length;
    const cy = poly.reduce((s, p) => s + tz(p[1]), 0) / poly.length;
    ctx.fillStyle = "#4a3728";
    ctx.font = "16px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText((z.name as string) ?? "", cx, cy);
  });

  // Walls
  ctx.strokeStyle = "#2c2c2c";
  ctx.lineCap = "round";
  walls.forEach((w) => {
    if (!w.start || !w.end) return;
    ctx.lineWidth = Math.max(3, ((w.thickness as number) ?? 0.1) * scale);
    ctx.beginPath();
    ctx.moveTo(tx(w.start[0]), tz(w.start[1]));
    ctx.lineTo(tx(w.end[0]), tz(w.end[1]));
    ctx.stroke();
  });

  return canvas.toDataURL("image/png");
}

// Dev-only: expose the store + export helpers so the spike can drive the real
// export path from the browser console (removed by dead-code elim in prod builds).
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  (window as any).__dd = { useScene, sceneToAnalysis, sceneToTopDownPng };
}

/** Full handoff: derive payload from the scene and POST to DesignDesk. */
export async function sendToDesignDesk(opts: {
  token: string;
  projectType?: "hdb" | "condo" | "landed" | "commercial";
}): Promise<{ session_id: string; floor_plan_url: string }> {
  const analysis = sceneToAnalysis();
  if (analysis.rooms.length === 0) {
    throw new Error("Add at least one zone (room) to the layout before sending.");
  }
  const payload: FromEditorPayload = {
    analysis,
    image_base64: sceneToTopDownPng(),
    project_type: opts.projectType,
    total_sqft: analysis.total_estimated_sqft,
  };

  const res = await fetch(`${API}/api/floor-plan/from-editor`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${opts.token}` },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}
