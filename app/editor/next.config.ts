import type { NextConfig } from "next";
import * as path from "node:path";

// @pascal-app/* ship raw TS/TSX source (their package `exports` point at
// ./src/index.tsx), so Next must transpile them rather than treat them as
// prebuilt JS. This is the app/marketing pattern applied to the 3D editor.
const nextConfig: NextConfig = {
  transpilePackages: ["@pascal-app/core", "@pascal-app/viewer", "@pascal-app/editor"],
  reactStrictMode: false, // R3F + the editor's external store dislike double-invoke

  // The vendored nodes (git v0.9.1) reference a couple of @pascal-app/core
  // exports the *published* v0.9.1 dropped (e.g. parseMaterialRef). We can't
  // fully type-check third-party source against a skewed published package, and
  // the raw @react-three/fiber / zod d.ts also trip esModuleInterop — so skip
  // TS/ESLint in the build. The webpack compile (SWC) is the real gate. Our own
  // app code is type-checked separately.
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },

  webpack: (config) => {
    // Route every `@pascal-app/core` import (nodes, editor, viewer) through a
    // shim that re-exports the real core and adds the missing `parseMaterialRef`.
    // `$` = exact match, so the shim's own relative import of the real dist is
    // untouched and there's no resolution cycle.
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      "@pascal-app/core$": path.resolve(process.cwd(), "lib/pascal-core-shim.ts"),
    };
    return config;
  },
};

export default nextConfig;
