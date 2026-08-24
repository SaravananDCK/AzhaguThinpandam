import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MAX_LINE_QTY } from "@/lib/availability";

// Mirrors the browser cart for the logged-in customer — see the CartLine
// model for why. The browser stays the source of truth; this endpoint just
// keeps the server copy current so abandoned carts are visible for follow-up.

const putSchema = z.object({
  items: z
    .array(
      z.object({
        variantId: z.string().min(1),
        qty: z.number().int().min(1).max(MAX_LINE_QTY),
      })
    )
    .max(50),
});

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  }
  const parsed = putSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid cart." }, { status: 400 });
  }

  // Replace wholesale: the browser sends its complete cart every time, so the
  // mirror never needs per-line reconciliation. Unknown variant ids are
  // dropped silently — a stale local cart must never fail the sync.
  const validIds = new Set(
    (
      await prisma.productVariant.findMany({
        where: { id: { in: parsed.data.items.map((i) => i.variantId) } },
        select: { id: true },
      })
    ).map((v) => v.id)
  );
  const items = parsed.data.items.filter((i) => validIds.has(i.variantId));

  await prisma.$transaction([
    prisma.cartLine.deleteMany({ where: { userId: session.user.id } }),
    prisma.cartLine.createMany({
      data: items.map((i) => ({
        userId: session.user.id,
        variantId: i.variantId,
        qty: i.qty,
      })),
    }),
  ]);

  return NextResponse.json({ ok: true, lines: items.length });
}
