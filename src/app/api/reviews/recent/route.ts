import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { REVIEW_STATUSES } from "@/lib/constants";

// Public feed for the storefront's floating Reviews tab: the latest approved
// reviews across all products. Fetched only when the panel is opened, so it
// costs nothing on a normal page load.
export async function GET() {
  const reviews = await prisma.review.findMany({
    where: { status: REVIEW_STATUSES.APPROVED, product: { isActive: true } },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      rating: true,
      title: true,
      body: true,
      authorName: true,
      verifiedPurchase: true,
      createdAt: true,
      product: { select: { name: true, slug: true } },
    },
  });

  const agg = await prisma.product.aggregate({
    where: { isActive: true, ratingCount: { gt: 0 } },
    _sum: { ratingCount: true },
  });

  return NextResponse.json({
    total: agg._sum.ratingCount ?? 0,
    reviews: reviews.map((r) => ({
      ...r,
      authorName: r.authorName?.trim() || "Customer",
    })),
  });
}
