import type { NextConfig } from "next";

// @pascal-app/* ship raw TS/TSX source (their package `exports` point at
// ./src/index.tsx), so Next must transpile them rather than treat them as
// prebuilt JS. This is the app/marketing pattern applied to the 3D editor.
const nextConfig: NextConfig = {
  transpilePackages: ["@pascal-app/core", "@pascal-app/viewer", "@pascal-app/editor"],
  reactStrictMode: false, // R3F + the editor's external store dislike double-invoke
};

export default nextConfig;
