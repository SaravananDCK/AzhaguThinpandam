import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { REVIEW_STATUSES } from "@/lib/constants";

const stars = z.number().int().min(1).max(5);

const reviewSchema = z.object({
  rating: stars,
  tasteRating: stars.nullish(),
  packingRating: stars.nullish(),
  deliveryRating: stars.nullish(),
  authorName: z.string().trim().max(80).optional().or(z.literal("")),
  title: z.string().trim().max(120).optional().or(z.literal("")),
  body: z.string().trim().max(2000).optional().or(z.literal("")),
});

/**
 * A customer's review of a delivered order — the whole experience (taste,
 * packing, delivery), not one product. Same access model as the order page:
 * the unguessable order number is the credential, so the link in the
 * "delivered" WhatsApp message works without signing in. One review per order;
 * resubmitting edits it, and every submission waits for admin approval.
 */
export async function POST(req: Request, ctx: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await ctx.params;
  const order = await prisma.order.findUnique({
    where: { orderNumber: orderNumber.toUpperCase() },
    select: { id: true, status: true, userId: true, shipName: true },
  });
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (order.status !== "DELIVERED") {
    return NextResponse.json(
      { error: "You can review this order once it has been delivered." },
      { status: 400 }
    );
  }

  const parsed = reviewSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid review." },
      { status: 400 }
    );
  }
  const r = parsed.data;
  const data = {
    rating: r.rating,
    tasteRating: r.tasteRating ?? null,
    packingRating: r.packingRating ?? null,
    deliveryRating: r.deliveryRating ?? null,
    title: r.title || null,
    body: r.body || null,
    authorName: r.authorName || order.shipName.trim() || null,
    status: REVIEW_STATUSES.PENDING,
  };

  await prisma.review.upsert({
    where: { orderId: order.id },
    create: { ...data, orderId: order.id, userId: order.userId, verifiedPurchase: true },
    update: data,
  });

  return NextResponse.json({ ok: true, status: REVIEW_STATUSES.PENDING });
}
