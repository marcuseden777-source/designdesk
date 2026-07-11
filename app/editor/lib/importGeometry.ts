// Client helpers to pull floor-plan geometry into the editor:
//  - fetchSessionGeometry: hydrate from an existing design session (?session_id=)
//  - uploadPlanForGeometry: extract geometry from a freshly uploaded plan image
//
// Both return the geometry + source image URL, which geometryToSceneGraph turns
// into a scene (walls + rooms + tracing underlay).
"use client";

import type { FloorPlanGeometry } from "./geometryToScene";

const API = process.env.NEXT_PUBLIC_API_URL ?? "https://designdesk.onrender.com";

export interface ImportedGeometry {
  geometry: FloorPlanGeometry;
  floorPlanUrl?: string;
}

/** GET an existing session and pull the geometry stashed in floor_plan_analysis. */
export async function fetchSessionGeometry(
  sessionId: string,
  token: string
): Promise<ImportedGeometry | null> {
  const res = await fetch(`${API}/api/floor-plan/session/${encodeURIComponent(sessionId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Could not load session (${res.status})`);
  }
  const row = await res.json();
  const geometry: FloorPlanGeometry | undefined = row?.floor_plan_analysis?.geometry;
  if (!geometry || !Array.isArray(geometry.rooms) || geometry.rooms.length === 0) {
    return null; // session has no geometry (e.g. a plain /analyze session) — nothing to seed
  }
  return { geometry, floorPlanUrl: row.floor_plan_url };
}

/** Upload a plan image and extract editable geometry from it. */
export async function uploadPlanForGeometry(
  file: File,
  token: string
): Promise<ImportedGeometry> {
  const form = new FormData();
  form.append("floor_plan", file);
  const res = await fetch(`${API}/api/floor-plan/extract-geometry`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Extraction failed (${res.status})`);
  }
  const data = await res.json();
  return { geometry: data.geometry, floorPlanUrl: data.floor_plan_url };
}
