import { cache } from "react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Which price list the current viewer sees.
 *
 * Deliberately read from the database, not the session token: sessions last
 * 180 days, so a flag cached in the JWT would stay stale for months after an
 * admin toggles it. React's `cache` dedupes the lookup across every server
 * component in a single render, and anonymous visitors cost zero queries.
 */
export const getViewerPricing = cache(async (): Promise<{ isEmployee: boolean }> => {
  const session = await auth();
  if (!session?.user?.id) return { isEmployee: false };
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isEmployee: true },
  });
  return { isEmployee: user?.isEmployee ?? false };
});
