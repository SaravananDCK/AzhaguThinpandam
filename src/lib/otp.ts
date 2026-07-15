import crypto from "crypto";
import { prisma } from "@/lib/prisma";

const OTP_TTL_MS = 5 * 60 * 1000; // codes valid for 5 minutes
const MAX_VERIFY_ATTEMPTS = 5; // wrong guesses before the code is dead
const MAX_SENDS_PER_WINDOW = 3; // sends per phone per window
const SEND_WINDOW_MS = 10 * 60 * 1000;

/** Accepts "98421 72765", "+91 98421 72765", "09842172765" → "9842172765" */
export function normalizePhone(raw: string): string | null {
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

function hashCode(phone: string, code: string): string {
  return crypto
    .createHmac("sha256", process.env.AUTH_SECRET ?? "dev-secret")
    .update(`${phone}:${code}`)
    .digest("hex");
}

export type CreateOtpResult =
  | { ok: true; code: string }
  | { ok: false; error: "rate_limited" };

/** Generates and stores a fresh OTP for the phone, enforcing the send limit. */
export async function createOtp(phone: string): Promise<CreateOtpResult> {
  const windowStart = new Date(Date.now() - SEND_WINDOW_MS);
  const recentSends = await prisma.otpCode.count({
    where: { phone, createdAt: { gte: windowStart } },
  });
  if (recentSends >= MAX_SENDS_PER_WINDOW) return { ok: false, error: "rate_limited" };

  const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
  await prisma.otpCode.create({
    data: {
      phone,
      codeHash: hashCode(phone, code),
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    },
  });
  return { ok: true, code };
}

/** Checks a code; consumes all codes for the phone on success. */
export async function verifyOtp(phone: string, code: string): Promise<boolean> {
  const otp = await prisma.otpCode.findFirst({
    where: { phone },
    orderBy: { createdAt: "desc" },
  });
  if (!otp) return false;
  if (otp.expiresAt < new Date() || otp.attempts >= MAX_VERIFY_ATTEMPTS) return false;

  const expected = Buffer.from(otp.codeHash, "hex");
  const actual = Buffer.from(hashCode(phone, code), "hex");
  const valid = expected.length === actual.length && crypto.timingSafeEqual(expected, actual);

  if (!valid) {
    await prisma.otpCode.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });
    return false;
  }

  await prisma.otpCode.deleteMany({ where: { phone } });
  return true;
}
