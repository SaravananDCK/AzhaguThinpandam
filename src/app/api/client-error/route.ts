import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { logError } from "@/lib/log";

// Browser error boundaries (src/app/error.tsx, global-error.tsx) post here so a
// crash that only happens on a customer's phone still shows up in the admin
// Errors page. Unauthenticated disk write, so the field caps and the per-IP
// limit below are the guard against someone filling the log.

const bodySchema = z.object({
  message: z.string().trim().min(1).max(500),
  stack: z.string().max(4000).optional(),
  digest: z.string().max(100).optional(),
  url: z.string().max(500).optional(),
  /** Chrome page translation was active (a known React-crasher — see translate-guard.ts) */
  translated: z.boolean().optional(),
  lang: z.string().max(20).optional(),
});

const ipHits = new Map<string, number[]>();
const WINDOW_MS = 60 * 1000;
const MAX_PER_WINDOW = 5;

function ipLimited(ip: string): boolean {
  const now = Date.now();
  const hits = (ipHits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (hits.length >= MAX_PER_WINDOW) return true;
  hits.push(now);
  ipHits.set(ip, hits);
  if (ipHits.size > 10_000) ipHits.clear();
  return false;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (ipLimited(ip)) return new NextResponse(null, { status: 429 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return new NextResponse(null, { status: 400 });

  const { message, stack, digest, url, translated, lang } = parsed.data;
  const session = await auth().catch(() => null);

  await logError("client", message, undefined, {
    stack,
    digest,
    url,
    ip,
    userAgent: req.headers.get("user-agent")?.slice(0, 300) ?? undefined,
    userId: session?.user?.id,
    extra: { translated: translated ?? false, lang },
  });
  return new NextResponse(null, { status: 204 });
}
