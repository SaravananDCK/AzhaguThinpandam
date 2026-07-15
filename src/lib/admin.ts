import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ROLES } from "@/lib/constants";

/** For admin pages/layouts — redirects non-admins away. */
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/admin");
  if (session.user.role !== ROLES.ADMIN) redirect("/");
  return session;
}

/** For admin API routes — returns the session, or a 401/403 response to send. */
export async function requireAdminApi() {
  const session = await auth();
  if (!session?.user) {
    return { session: null, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (session.user.role !== ROLES.ADMIN) {
    return { session: null, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session, response: null };
}

/** For admin server actions — throws on non-admin. */
export async function assertAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== ROLES.ADMIN) {
    throw new Error("Forbidden");
  }
  return session;
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Start of "today" in IST regardless of server timezone. */
export function startOfISTDay(daysAgo = 0) {
  const IST_OFFSET_MS = 5.5 * 3600 * 1000;
  const istNow = new Date(Date.now() + IST_OFFSET_MS);
  const startUtcMs =
    Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate() - daysAgo) -
    IST_OFFSET_MS;
  return new Date(startUtcMs);
}
