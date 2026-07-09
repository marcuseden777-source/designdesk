// Shoelace polygon area for editor zones.
//
// Pascal zone boundaries are polygons of [x, z] pairs. Assumed to be in METRES
// (confirm against the scene units before trusting the sqft output — if the scene
// is in millimetres, divide by 1e6 instead of using SQM_TO_SQFT directly).
export const SQM_TO_SQFT = 10.7639;

/** Absolute polygon area in the polygon's own square units (m² if points are metres). */
export function polygonArea(polygon: [number, number][]): number {
  const n = polygon.length;
  if (n < 3) return 0;
  let twice = 0;
  for (let i = 0; i < n; i++) {
    const [x1, z1] = polygon[i];
    const [x2, z2] = polygon[(i + 1) % n];
    twice += x1 * z2 - x2 * z1;
  }
  return Math.abs(twice) / 2;
}

/** Zone polygon (metres) → rounded square feet, for the FloorPlanAnalysis room. */
export function polygonAreaSqft(polygonMetres: [number, number][]): number {
  return Math.round(polygonArea(polygonMetres) * SQM_TO_SQFT);
}
