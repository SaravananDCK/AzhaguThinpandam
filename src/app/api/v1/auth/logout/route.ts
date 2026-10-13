import { NextResponse } from "next/server";
import { bearerToken, revokeApiToken } from "@/lib/api-auth";

/** Signs this device out of the mobile app. Always succeeds — an unknown token is already signed out. */
export async function POST() {
  const token = await bearerToken();
  if (token) await revokeApiToken(token);
  return NextResponse.json({ ok: true });
}
