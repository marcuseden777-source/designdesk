// Convert vision-extracted floor-plan geometry into a Pascal scene graph the
// editor can hydrate (via <Editor onLoad> or applySceneGraphToEditor).
//
// Input geometry is metric room polygons in [x, y], top-left origin, y-down
// (image orientation). Pascal's floor plane is [x, z] with z as the second axis,
// so we map y → z directly and recentre the plan on the origin.
//
// Walls: we prefer the extracted STRUCTURAL walls (geometry.walls) — they match
// the drawing and, crucially, leave open-plan areas open (no invented partitions).
// If none were extracted we fall back to deriving walls from room polygon edges.
// See the backend GEOMETRY_SYSTEM_PROMPT.
"use client";

import {
  SiteNode,
  BuildingNode,
  LevelNode,
  WallNode,
  ZoneNode,
  SlabNode,
  GuideNode,
} from "@pascal-app/core";

export interface GeometryRoom {
  name: string;
  type: string;
  polygon: [number, number][];
  is_wet_area?: boolean;
}
export interface WallSeg {
  start: [number, number];
  end: [number, number];
  thickness?: number | null;
}
export interface FloorPlanGeometry {
  units?: string;
  plan_width_m?: number;
  plan_height_m?: number;
  scale_source?: string;
  walls?: WallSeg[];
  rooms: GeometryRoom[];
  notes?: string[];
}

export interface SceneGraph {
  nodes: Record<string, unknown>;
  rootNodeIds: string[];
}

// A soft, distinct fill per room type so the generated plan reads at a glance.
const ROOM_COLORS: Record<string, string> = {
  bedroom: "#7c9cbf",
  living: "#c9a36a",
  dining: "#b98cc4",
  kitchen: "#d98b6a",
  bathroom: "#6ab5b0",
  utility: "#9aa0a6",
  outdoor: "#8bbf7c",
  circulation: "#c4b48c",
  other: "#3b82f6",
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Deduped undirected edge key, tolerant to ~1cm noise. */
function edgeKey(a: [number, number], b: [number, number]): string {
  const A = `${round2(a[0])},${round2(a[1])}`;
  const B = `${round2(b[0])},${round2(b[1])}`;
  return A < B ? `${A}|${B}` : `${B}|${A}`;
}

/**
 * Build a Pascal SceneGraph from extracted geometry. Returns null if there are
 * no usable rooms (the editor then shows its empty default scene).
 *
 * @param imageUrl optional source plan image → added as a 50%-opacity `guide`
 *        underlay behind the generated walls for visual QA / hand-correction.
 */
export function geometryToSceneGraph(
  geometry: FloorPlanGeometry,
  opts: { imageUrl?: string } = {}
): SceneGraph | null {
  const rooms = (geometry?.rooms ?? []).filter(
    (r) => Array.isArray(r.polygon) && r.polygon.length >= 3
  );
  if (rooms.length === 0) return null;

  const extractedWalls = (geometry?.walls ?? []).filter(
    (w) => Array.isArray(w?.start) && Array.isArray(w?.end)
  );

  // Recentre the plan on the origin so it sits inside the default 30×30 site and
  // the camera frames it. Use the bounding-box centre of rooms AND walls.
  const allPts: [number, number][] = rooms.flatMap((r) => r.polygon);
  for (const w of extractedWalls) {
    allPts.push(w.start as [number, number], w.end as [number, number]);
  }
  const xs = allPts.map((p) => p[0]);
  const ys = allPts.map((p) => p[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const spanX = Math.max(0.001, Math.max(...xs) - Math.min(...xs));
  // [x, y] image coords → centred Pascal [x, z] (y maps to z).
  const toXZ = (p: [number, number]): [number, number] => [round2(p[0] - cx), round2(p[1] - cy)];

  // Container chain: Site → Building → Level.
  const site: any = SiteNode.parse({ name: "Site" });
  const building: any = BuildingNode.parse({ name: "Building", parentId: site.id });
  const level: any = LevelNode.parse({ level: 0, name: "Ground Floor", parentId: building.id });

  const childIds: string[] = [];
  const nodes: Record<string, unknown> = {};

  // Zones (rooms) + slabs (floor plates).
  for (const room of rooms) {
    const ring = room.polygon.map(toXZ);
    const color = ROOM_COLORS[room.type] ?? ROOM_COLORS.other;
    const zone: any = ZoneNode.parse({
      name: room.name || "Room",
      polygon: ring,
      color,
      parentId: level.id,
      metadata: { type: room.type || "other", wet: room.is_wet_area === true },
    });
    const slab: any = SlabNode.parse({ polygon: ring, parentId: level.id });
    nodes[zone.id] = zone;
    nodes[slab.id] = slab;
    childIds.push(zone.id, slab.id);
  }

  // Walls. Prefer the extracted structural walls (they match the drawing and keep
  // open-plan areas open); fall back to deriving from room edges if none exist.
  const seen = new Set<string>();
  const addWall = (a: [number, number], b: [number, number], thickness?: number | null) => {
    if (a[0] === b[0] && a[1] === b[1]) return; // zero-length
    const key = edgeKey(a, b);
    if (seen.has(key)) return;
    seen.add(key);
    const props: any = { start: a, end: b, parentId: level.id };
    if (thickness && thickness > 0) props.thickness = thickness;
    const wall: any = WallNode.parse(props);
    nodes[wall.id] = wall;
    childIds.push(wall.id);
  };

  if (extractedWalls.length > 0) {
    for (const w of extractedWalls) {
      addWall(toXZ(w.start as [number, number]), toXZ(w.end as [number, number]), w.thickness ?? undefined);
    }
  } else {
    for (const room of rooms) {
      const ring = room.polygon.map(toXZ);
      for (let i = 0; i < ring.length; i++) {
        addWall(ring[i], ring[(i + 1) % ring.length]);
      }
    }
  }

  // Optional tracing underlay: the original plan image as a guide plane. The
  // guide plane spans 10*scale metres wide, so scale = planWidth/10 aligns it to
  // the generated geometry; centred at the origin, half-opacity, below the walls.
  if (opts.imageUrl) {
    try {
      const planWidth = geometry.plan_width_m && geometry.plan_width_m > 0 ? geometry.plan_width_m : spanX;
      const guide: any = GuideNode.parse({
        name: "Floor plan (source)",
        url: opts.imageUrl,
        position: [0, 0.01, 0],
        rotation: [0, 0, 0],
        scale: round2(planWidth / 10),
        opacity: 45,
        scaleReference: null,
        parentId: level.id,
      });
      nodes[guide.id] = guide;
      childIds.push(guide.id);
    } catch {
      // Guide is a nicety — never let it break the generated scene.
    }
  }

  level.children = childIds;
  building.children = [level.id];
  site.children = [building.id];
  nodes[level.id] = level;
  nodes[building.id] = building;
  nodes[site.id] = site;

  return { nodes, rootNodeIds: [site.id] };
}
