import { nodeRegistry, registerNode, type AnyNodeDefinition } from "@pascal-app/core";
import { builtinPlugin } from "../pascal-nodes";

// Populate the client-side node registry BEFORE any <Editor>/<Viewer> mounts.
// Pascal renders every node through this registry; @pascal-app/nodes (the built-in
// wall/zone/slab/item/etc. definitions) is an unpublished workspace package, so a
// standalone consumer must vendor it (../pascal-nodes) and register here — otherwise
// the registry is empty on the client and the editor hangs on its loading overlay.
let loaded = false;
export function loadBuiltins(): void {
  if (loaded) return;
  loaded = true;
  for (const def of builtinPlugin.nodes ?? []) {
    if (nodeRegistry.has((def as AnyNodeDefinition).kind)) continue;
    registerNode(def as AnyNodeDefinition);
  }
}

loadBuiltins();
