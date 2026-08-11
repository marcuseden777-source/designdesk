// Client helpers connecting the 3D Layout Studio to the DesignDesk backend:
//  - fetchSessionScene: hydrate from an existing design session (?session_id=
//    or the project picker) — prefers a previously saved Studio scene, falls
//    back to the vision-extracted floor-plan geometry
//  - uploadPlanForGeometry: extract geometry from a freshly uploaded plan image
//    (this CREATES a design session server-side; the Studio binds to it)
//  - saveSessionScene: persist the live scene graph into that session
//  - listSessions: the user's sessions, for the "Open project" panel
"use client";

import type { FloorPlanGeometry } from "./geometryToScene";
import type { SceneGraph } from "./geometryToScene";

const API = process.env.NEXT_PUBLIC_API_URL ?? "https://designdesk.onrender.com";

export interface ImportedGeometry {
  geometry: FloorPlanGeometry;
  floorPlanUrl?: string;
  sessionId?: string;
}

export interface SessionScene {
  /** A Studio scene saved earlier — highest-fidelity way to reopen a project. */
  editorScene: SceneGraph | null;
  /** Vision-extracted geometry — the fallback seed when no scene was saved. */
  geometry: FloorPlanGeometry | null;
  floorPlanUrl?: string;
}

export interface SessionSummary {
  id: string;
  floor_plan_url: string | null;
  generated_design_url: string | null;
  status: string | null;
  created_at: string;
  project_type: string | null;
  total_sqft: number | null;
}

/** GET an existing session; return the saved Studio scene and/or extracted geometry. */
export async function fetchSessionScene(
  sessionId: string,
  token: string
): Promise<SessionScene> {
  const res = await fetch(`${API}/api/floor-plan/session/${encodeURIComponent(sessionId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Could not load session (${res.status})`);
  }
  const row = await res.json();
  const analysis = row?.floor_plan_analysis ?? {};
  const editorScene: SceneGraph | undefined = analysis.editor_scene;
  const geometry: FloorPlanGeometry | undefined = analysis.geometry;
  return {
    editorScene:
      editorScene && editorScene.nodes && Array.isArray(editorScene.rootNodeIds)
        ? editorScene
        : null,
    geometry:
      geometry && Array.isArray(geometry.rooms) && geometry.rooms.length > 0 ? geometry : null,
    floorPlanUrl: row?.floor_plan_url ?? undefined,
  };
}

/** Upload a plan image and extract editable geometry (creates a session). */
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
  return {
    geometry: data.geometry,
    floorPlanUrl: data.floor_plan_url,
    sessionId: data.session_id,
  };
}

/**
 * Persist the live Studio scene into its design session. `keepalive` lets the
 * autosave flush survive page unload (a normal fetch is cancelled mid-flight).
 */
export async function saveSessionScene(
  sessionId: string,
  token: string,
  scene: SceneGraph,
  opts: { keepalive?: boolean } = {}
): Promise<void> {
  const res = await fetch(
    `${API}/api/floor-plan/session/${encodeURIComponent(sessionId)}/scene`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ scene }),
      keepalive: opts.keepalive === true,
    }
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Save failed (${res.status})`);
  }
}

/** The signed-in user's design sessions, newest first. */
export async function listSessions(token: string): Promise<SessionSummary[]> {
  const res = await fetch(`${API}/api/floor-plan/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Could not load projects (${res.status})`);
  }
  return (await res.json()) as SessionSummary[];
}
