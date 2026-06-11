/**
 * Patches expo-router's _ctx files to use a literal path instead of process.env.
 * Metro's require.context needs a static string literal - env vars don't work.
 * Run via: node scripts/patch-expo-router.js
 * Also runs automatically via postinstall.
 */
const fs = require("fs");
const path = require("path");

const ROUTER_DIR = path.join(__dirname, "..", "node_modules", "expo-router");

// Metro's require.context needs a static literal path relative to the _ctx file.
// _ctx files live at node_modules/expo-router/_ctx*.js
// ../../app goes: node_modules/expo-router/ -> node_modules/ -> project root -> app/
const patches = {
  "_ctx.ios.js": `export const ctx = require.context(
  "../../app",
  true,
  /^(?:\\.\\/)(?!(?:(?:(?:.*\\+api)|(?:\\+html)|(?:\\+middleware)))\\.[tj]sx?$).*(?:\\.android|\\.web)?\\.[tj]sx?$/,
  "sync"
);`,
  "_ctx.android.js": `export const ctx = require.context(
  "../../app",
  true,
  /^(?:\\.\\/)(?!(?:(?:(?:.*\\+api)|(?:\\+html)|(?:\\+middleware)))\\.[tj]sx?$).*(?:\\.ios|\\.web)?\\.[tj]sx?$/,
  "sync"
);`,
  "_ctx.js": `export const ctx = require.context(
  "../../app",
  true,
  /^(?:\\.\\/)(?!(?:(?:(?:.*\\+api)|(?:\\+html)))\\.[tj]sx?$).*\\.[tj]sx?$/
);`,
  "_ctx.web.js": `export const ctx = require.context(
  "../../app",
  true,
  /^(?:\\.\\/)(?!(?:(?:(?:.*\\+api)|(?:\\+middleware)|(?:\\+(html|native-intent))))\\.[tj]sx?$).*(?:\\.android|\\.ios|\\.native)?\\.[tj]sx?$/,
  "sync"
);`,
};

for (const [file, content] of Object.entries(patches)) {
  const filePath = path.join(ROUTER_DIR, file);
  if (fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, content, "utf8");
    console.log(`✓ Patched ${file}`);
  } else {
    console.warn(`⚠ Not found: ${file}`);
  }
}
