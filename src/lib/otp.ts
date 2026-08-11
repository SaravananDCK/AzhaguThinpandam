import crypto from "crypto";
import { prisma } from "@/lib/prisma";

const OTP_TTL_MS = 5 * 60 * 1000; // codes valid for 5 minutes
const MAX_VERIFY_ATTEMPTS = 5; // wrong guesses before the code is dead
const MAX_SENDS_PER_WINDOW = 3; // sends per identifier per window
const SEND_WINDOW_MS = 10 * 60 * 1000;

// An OTP identifier is either a normalized 10-digit Indian mobile (WhatsApp
// channel) or a lowercased email (SMTP channel, for customers abroad). The two
// namespaces are disjoint, so they share the OtpCode table's `phone` column.

/** Accepts "98421 72765", "+91 98421 72765", "09842172765" → "9842172765" */
export function normalizePhone(raw: string): string | null {
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

/** Lowercased/trimmed email, or null. Basic shape check only — the OTP
    round-trip is the real validation. */
export function normalizeEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase();
  if (email.length < 6 || email.length > 200) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? email : null;
}

function hashCode(identifier: string, code: string): string {
  return crypto
    .createHmac("sha256", process.env.AUTH_SECRET ?? "dev-secret")
    .update(`${identifier}:${code}`)
    .digest("hex");
}

export type CreateOtpResult =
  | { ok: true; code: string }
  | { ok: false; error: "rate_limited" };

/** Generates and stores a fresh OTP for the identifier, enforcing the send limit. */
export async function createOtp(identifier: string): Promise<CreateOtpResult> {
  const windowStart = new Date(Date.now() - SEND_WINDOW_MS);
  const recentSends = await prisma.otpCode.count({
    where: { phone: identifier, createdAt: { gte: windowStart } },
  });
  if (recentSends >= MAX_SENDS_PER_WINDOW) return { ok: false, error: "rate_limited" };

  const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
  await prisma.otpCode.create({
    data: {
      phone: identifier,
      codeHash: hashCode(identifier, code),
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    },
  });
  return { ok: true, code };
}

/** Checks a code; consumes all codes for the identifier on success. */
export async function verifyOtp(identifier: string, code: string): Promise<boolean> {
  const otp = await prisma.otpCode.findFirst({
    where: { phone: identifier },
    orderBy: { createdAt: "desc" },
  });
  if (!otp) return false;
  if (otp.expiresAt < new Date() || otp.attempts >= MAX_VERIFY_ATTEMPTS) return false;

  const expected = Buffer.from(otp.codeHash, "hex");
  const actual = Buffer.from(hashCode(identifier, code), "hex");
  const valid = expected.length === actual.length && crypto.timingSafeEqual(expected, actual);

  if (!valid) {
    await prisma.otpCode.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });
    return false;
  }

  await prisma.otpCode.deleteMany({ where: { phone: identifier } });
  return true;
}
