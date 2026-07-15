import { NextRequest, NextResponse } from "next/server";
import { createOtp, normalizePhone } from "@/lib/otp";
import { isOtpChannelConfigured, sendOtpMessage } from "@/lib/whatsapp";

// Best-effort per-IP throttle (single-process deployment). The per-phone
// limit in createOtp is the real guard against OTP pumping.
const ipHits = new Map<string, number[]>();
const IP_WINDOW_MS = 60 * 60 * 1000;
const IP_MAX_PER_WINDOW = 15;

function ipLimited(ip: string): boolean {
  const now = Date.now();
  const hits = (ipHits.get(ip) ?? []).filter((t) => now - t < IP_WINDOW_MS);
  if (hits.length >= IP_MAX_PER_WINDOW) return true;
  hits.push(now);
  ipHits.set(ip, hits);
  if (ipHits.size > 10_000) ipHits.clear(); // memory backstop
  return false;
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const rawPhone = (body as { phone?: unknown })?.phone;
  const phone = typeof rawPhone === "string" ? normalizePhone(rawPhone) : null;
  if (!phone) {
    return NextResponse.json(
      { error: "Enter a valid 10-digit Indian mobile number." },
      { status: 400 },
    );
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (ipLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 },
    );
  }

  const configured = isOtpChannelConfigured();
  if (!configured && process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Login is temporarily unavailable. Please try again later." },
      { status: 503 },
    );
  }

  const result = await createOtp(phone);
  if (!result.ok) {
    return NextResponse.json(
      { error: "Too many codes requested. Please wait 10 minutes and try again." },
      { status: 429 },
    );
  }

  if (configured) {
    try {
      await sendOtpMessage(phone, result.code);
    } catch (e) {
      console.error("[otp] WhatsApp delivery failed:", e);
      return NextResponse.json(
        { error: "Could not send the code. Please try again." },
        { status: 502 },
      );
    }
    return NextResponse.json({ ok: true });
  }

  // Dev fallback: no WhatsApp credentials — surface the code locally.
  console.log(`[otp] DEV MODE — code for ${phone}: ${result.code}`);
  return NextResponse.json({ ok: true, devCode: result.code });
}
