import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { normalizeEmail, normalizePhone, verifyOtp } from "@/lib/otp";
import { issueApiToken } from "@/lib/api-auth";

// Mobile-app sign-in: trades a one-time code (requested from /api/otp/request,
// the same endpoint the website uses) for a device token. Mirrors the
// `phone-otp` and `email-otp` providers in src/lib/auth.ts rule for rule —
// first sign-in creates the account, and admins can never sign in by code.

const schema = z.object({
  phone: z.string().optional(),
  email: z.string().optional(),
  code: z.string().trim().regex(/^\d{6}$/),
  deviceName: z.string().max(100).optional(),
});

const INVALID = "That code is incorrect or has expired. Please request a new one.";

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  // Exactly one channel, as in /api/otp/request
  if (!parsed.success || (parsed.data.phone == null) === (parsed.data.email == null)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const { code, deviceName } = parsed.data;

  let user;
  if (parsed.data.phone != null) {
    const phone = normalizePhone(parsed.data.phone);
    if (!phone || !(await verifyOtp(phone, code))) {
      return NextResponse.json({ error: INVALID }, { status: 401 });
    }
    user = await prisma.user.upsert({ where: { phone }, update: {}, create: { phone } });
  } else {
    const email = normalizeEmail(parsed.data.email ?? "");
    if (!email) return NextResponse.json({ error: INVALID }, { status: 401 });
    // Admins must use their password — checked before verifyOtp so a rejected
    // attempt doesn't consume the code (same as the email-otp provider).
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && (existing.role === "ADMIN" || existing.passwordHash)) {
      return NextResponse.json({ error: INVALID }, { status: 401 });
    }
    if (!(await verifyOtp(email, code))) {
      return NextResponse.json({ error: INVALID }, { status: 401 });
    }
    user = await prisma.user.upsert({ where: { email }, update: {}, create: { email } });
  }

  const token = await issueApiToken(user.id, deviceName);
  return NextResponse.json({
    token,
    user: { id: user.id, name: user.name, phone: user.phone, email: user.email },
  });
}
