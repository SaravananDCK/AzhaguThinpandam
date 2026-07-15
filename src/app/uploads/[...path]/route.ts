import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { getUploadsDir } from "@/lib/uploads";

const CONTENT_TYPES: Record<string, string> = {
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".avif": "image/avif",
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params;
  const dir = getUploadsDir();
  const filePath = path.resolve(dir, ...segments);

  // Prevent path traversal
  if (!filePath.startsWith(dir + path.sep)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const contentType = CONTENT_TYPES[path.extname(filePath).toLowerCase()];
  if (!contentType) return new NextResponse("Not found", { status: 404 });

  try {
    const data = await fs.readFile(filePath);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": contentType,
        // Filenames are content-hashed at upload, safe to cache forever
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
