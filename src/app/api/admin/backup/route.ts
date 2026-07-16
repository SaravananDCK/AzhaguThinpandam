import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { readFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin";

// Streams a consistent snapshot of the SQLite database. VACUUM INTO writes a
// clean, compacted copy that is safe even while the app is serving traffic
// (a raw file copy of a WAL database can be corrupt).
export async function GET() {
  const { response } = await requireAdminApi();
  if (response) return response;

  const target = path.join(tmpdir(), `azhagu-backup-${randomBytes(6).toString("hex")}.db`);
  // VACUUM INTO fails if the file exists; the random name guarantees it doesn't
  const escaped = target.replace(/\\/g, "/").replace(/'/g, "''");

  try {
    await prisma.$executeRawUnsafe(`VACUUM INTO '${escaped}'`);
    const data = await readFile(target);
    const stamp = new Date()
      .toISOString()
      .slice(0, 16)
      .replace(/[T:]/g, "-");
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="azhagu-db-${stamp}.db"`,
        "Content-Length": String(data.byteLength),
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("Backup failed:", e);
    return NextResponse.json({ error: "Backup failed." }, { status: 500 });
  } finally {
    unlink(target).catch(() => {});
  }
}
