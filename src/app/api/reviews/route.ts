import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPurchasedProduct } from "@/lib/reviews";
import { REVIEW_STATUSES } from "@/lib/constants";

const reviewSchema = z.object({
  productId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(120).optional().or(z.literal("")),
  body: z.string().trim().max(2000).optional().or(z.literal("")),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in to write a review." }, { status: 401 });
  }

  const parsed = reviewSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid review." },
      { status: 400 }
    );
  }
  const { productId, rating, title, body } = parsed.data;

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, isActive: true },
  });
  if (!product || !product.isActive) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

  // Anyone signed in may review — many customers order over WhatsApp, so their
  // purchase often isn't linked to the account. Buying isn't required, but it
  // is what earns the "Verified purchase" badge, so snapshot it here. Every
  // review still waits for admin approval before it shows.
  const purchased = await hasPurchasedProduct(
    { id: session.user.id, phone: session.user.phone },
    productId
  );

  const authorName = session.user.name?.trim() || null;

  // New submissions and edits both go back to PENDING for (re-)moderation.
  await prisma.review.upsert({
    where: { productId_userId: { productId, userId: session.user.id } },
    create: {
      productId,
      userId: session.user.id,
      rating,
      title: title || null,
      body: body || null,
      authorName,
      verifiedPurchase: purchased,
      status: REVIEW_STATUSES.PENDING,
    },
    update: {
      rating,
      title: title || null,
      body: body || null,
      authorName,
      verifiedPurchase: purchased,
      status: REVIEW_STATUSES.PENDING,
    },
  });

  return NextResponse.json({ ok: true, status: REVIEW_STATUSES.PENDING });
}
