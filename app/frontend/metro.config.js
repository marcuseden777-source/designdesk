const path = require("path");

// Must be set before Metro spawns transform workers
process.env.EXPO_ROUTER_APP_ROOT = path.join(__dirname, "app");

const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

config.transformer = {
  ...config.transformer,
  unstable_allowRequireContext: true,
};

// Apply NativeWind first — it sets its own resolveRequest
const finalConfig = withNativeWind(config, { input: "./global.css" });

// Wrap NativeWind's resolveRequest so our intercept runs first.
// We redirect expo-router/_ctx to project-root _ctx files that use
// "./app" — a clean path within the project root (no node_modules traversal).
const nwResolve = finalConfig.resolver.resolveRequest;
finalConfig.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "expo-router/_ctx") {
    const ext = platform === "ios"
      ? "_ctx.ios.js"
      : platform === "android"
      ? "_ctx.android.js"
      : "_ctx.js";
    return {
      filePath: path.join(__dirname, ext),
      type: "sourceFile",
    };
  }
  return nwResolve(context, moduleName, platform);
};

module.exports = finalConfig;
