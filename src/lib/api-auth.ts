import crypto from "node:crypto";
import { cache } from "react";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Who is making this request — for the website (Auth.js session cookie) and
// the mobile app (an `Authorization: Bearer` token) alike. Routes that both
// clients call resolve the customer through here, so there is one checkout,
// one pricing path and one set of rules whichever client is asking.
//
// App tokens are opaque random strings, stored only as a SHA-256 hash, one
// ApiSession row per signed-in device. That makes "sign out" and "delete my
// account" a row delete, and gives push notifications their device list.

const TOKEN_TTL_MS = 180 * 24 * 60 * 60 * 1000; // matches the web session
// Rolling expiry, but written at most once a day per device — not per request
const ROLL_AFTER_MS = 24 * 60 * 60 * 1000;

export type CurrentUser = {
  id: string;
  phone: string | null;
  email: string | null;
  name: string | null;
  role: string;
};

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** Creates a device session and returns the token — the only time it exists in the clear. */
export async function issueApiToken(userId: string, deviceName?: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("base64url");
  await prisma.apiSession.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      deviceName: deviceName?.trim().slice(0, 100) || null,
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    },
  });
  return token;
}

/** Signs one device out. Unknown tokens are ignored. */
export async function revokeApiToken(token: string): Promise<void> {
  await prisma.apiSession.deleteMany({ where: { tokenHash: hashToken(token) } });
}

/** The bearer token on this request, if any. */
export async function bearerToken(): Promise<string | null> {
  const header = (await headers()).get("authorization") ?? "";
  return header.match(/^Bearer\s+(\S+)$/i)?.[1] ?? null;
}

async function userFromToken(token: string): Promise<CurrentUser | null> {
  const session = await prisma.apiSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      user: { select: { id: true, phone: true, email: true, name: true, role: true } },
    },
  });
  if (!session || session.expiresAt < new Date()) return null;
  if (Date.now() - session.lastUsedAt.getTime() > ROLL_AFTER_MS) {
    await prisma.apiSession.updateMany({
      where: { id: session.id },
      data: { lastUsedAt: new Date(), expiresAt: new Date(Date.now() + TOKEN_TTL_MS) },
    });
  }
  return session.user;
}

/**
 * The signed-in customer, or null. A request that presents a bearer token is
 * judged on that token alone — a bad or expired one is "not signed in", never
 * a silent fall-through to whatever cookie happens to be there. Deduped per
 * request, so pricing helpers and the route can both ask.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = await bearerToken();
  if (token) return userFromToken(token);

  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    phone: session.user.phone ?? null,
    email: session.user.email ?? null,
    name: session.user.name ?? null,
    role: session.user.role,
  };
});

/** For routes that need a customer — the user, or the 401 to send back. */
export async function requireUser(): Promise<
  { user: CurrentUser; response: null } | { user: null; response: NextResponse }
> {
  const user = await getCurrentUser();
  if (user) return { user, response: null };
  return {
    user: null,
    response: NextResponse.json(
      { error: "Please sign in to continue.", needsAuth: true },
      { status: 401 }
    ),
  };
}
