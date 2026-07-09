// Compat shim for @pascal-app/core.
//
// The vendored nodes (from git v0.9.1) import `parseMaterialRef` from
// @pascal-app/core, but the npm-published core@0.9.1 doesn't export it (the npm
// publish and git tag diverge on the material API). We re-implement it here and
// alias @pascal-app/core → this module (see next.config webpack alias).
//
// The real core is imported by RELATIVE path to bypass its package `exports` map
// (which only exposes "."), and to avoid the alias resolving back to this shim.
// A namespace import is used so helpers the published core happens NOT to export
// (e.g. getSceneMaterialIdFromRef) degrade to `undefined` at runtime instead of
// being a hard compile error — parseMaterialRef then just falls through.
export * from "../node_modules/@pascal-app/core/dist/index.js";
import * as core from "../node_modules/@pascal-app/core/dist/index.js";

const c = core as unknown as {
  getLibraryMaterialIdFromRef?: (ref?: string | null) => string | null | undefined;
  getSceneMaterialIdFromRef?: (ref?: string | null) => string | null | undefined;
};

export function parseMaterialRef(ref?: string | null) {
  const lib = c.getLibraryMaterialIdFromRef?.(ref);
  if (lib) return { kind: "library", id: lib } as const;
  const scene = c.getSceneMaterialIdFromRef?.(ref);
  if (scene) return { kind: "scene", id: scene } as const;
  return null;
}
