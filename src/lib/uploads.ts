import path from "node:path";

/**
 * Directory where admin-uploaded images live. Outside public/ so it can be a
 * Docker volume; files are served by the /uploads/[...path] route handler.
 */
export function getUploadsDir() {
  return path.resolve(/* turbopackIgnore: true */ process.cwd(), process.env.UPLOADS_DIR || "uploads");
}
