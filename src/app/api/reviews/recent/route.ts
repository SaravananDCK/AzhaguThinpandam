import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { REVIEW_STATUSES } from "@/lib/constants";

// Public feed for the storefront's floating Reviews tab: the latest approved
// reviews — order reviews and product reviews alike. Fetched only when the panel is opened, so it
// costs nothing on a normal page load.
export async function GET() {
  const reviews = await prisma.review.findMany({
    where: {
      status: REVIEW_STATUSES.APPROVED,
      // Order reviews have no product; hide product reviews of delisted items
      OR: [{ productId: null }, { product: { isActive: true } }],
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      rating: true,
      tasteRating: true,
      packingRating: true,
      deliveryRating: true,
      title: true,
      body: true,
      authorName: true,
      verifiedPurchase: true,
      createdAt: true,
      product: { select: { name: true, slug: true } },
    },
  });

  const total = await prisma.review.count({
    where: {
      status: REVIEW_STATUSES.APPROVED,
      OR: [{ productId: null }, { product: { isActive: true } }],
    },
  });

  return NextResponse.json({
    total,
    reviews: reviews.map((r) => ({
      ...r,
      authorName: r.authorName?.trim() || "Customer",
    })),
  });
}
