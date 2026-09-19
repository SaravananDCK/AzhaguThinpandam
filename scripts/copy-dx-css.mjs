// Copies DevExtreme's light and dark stylesheets (and their icon font) into
// public/dx so the admin can switch between them at runtime. A CSS import
// would bake one theme into the bundle; a <link> whose href the theme toggle
// swaps (src/components/admin/dx-theme.tsx) lets the grids follow the admin's
// light/dark choice. Runs before `next dev` / `next build` (package.json).
import { cpSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "node_modules", "devextreme", "dist", "css");
const dest = path.join(root, "public", "dx");

if (!existsSync(src)) {
  console.error("copy-dx-css: devextreme is not installed — run npm install first");
  process.exit(1);
}
mkdirSync(dest, { recursive: true });
for (const name of ["dx.light.css", "dx.dark.css"]) {
  cpSync(path.join(src, name), path.join(dest, name));
}
cpSync(path.join(src, "icons"), path.join(dest, "icons"), { recursive: true });
console.log("copy-dx-css: public/dx is up to date");
