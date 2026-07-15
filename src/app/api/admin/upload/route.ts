import { NextResponse } from "next/server";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { requireAdminApi } from "@/lib/admin";
import { getUploadsDir } from "@/lib/uploads";

const MAX_SIZE = 8 * 1024 * 1024; // 8 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

export async function POST(req: Request) {
  const { response } = await requireAdminApi();
  if (response) return response;

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Only JPEG, PNG, WebP or AVIF images are allowed." },
      { status: 400 }
    );
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Image must be under 8 MB." }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    // Resize once at upload time — no per-request image processing on the VPS
    const processed = await sharp(buffer)
      .rotate() // respect EXIF orientation
      .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();

    const name = `${crypto.randomBytes(8).toString("hex")}.webp`;
    const dir = getUploadsDir();
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, name), processed);

    return NextResponse.json({ url: `/uploads/${name}` });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Could not process the image." }, { status: 500 });
  }
}
