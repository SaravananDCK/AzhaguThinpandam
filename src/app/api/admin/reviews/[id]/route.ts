import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin";
import { recomputeProductRating } from "@/lib/reviews";
import { REVIEW_STATUSES } from "@/lib/constants";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  status: z.enum([
    REVIEW_STATUSES.PENDING,
    REVIEW_STATUSES.APPROVED,
    REVIEW_STATUSES.REJECTED,
  ]),
});

export async function PATCH(req: NextRequest, { params }: Params) {
  const { response } = await requireAdminApi();
  if (response) return response;
  const { id } = await params;

  const existing = await prisma.review.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Review not found." }, { status: 404 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.review.update({ where: { id }, data: { status: parsed.data.status } });
    await recomputeProductRating(tx, existing.productId);
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { response } = await requireAdminApi();
  if (response) return response;
  const { id } = await params;

  const existing = await prisma.review.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Review not found." }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    await tx.review.delete({ where: { id } });
    await recomputeProductRating(tx, existing.productId);
  });
  return NextResponse.json({ ok: true });
}
