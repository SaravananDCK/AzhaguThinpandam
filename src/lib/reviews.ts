import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { REVIEW_STATUSES } from "@/lib/constants";

type Db = Prisma.TransactionClient | typeof prisma;

/** Recomputes a product's denormalised rating from its APPROVED reviews. */
export async function recomputeProductRating(db: Db, productId: string): Promise<void> {
  const agg = await db.review.aggregate({
    where: { productId, status: REVIEW_STATUSES.APPROVED },
    _avg: { rating: true },
    _count: { _all: true },
  });
  const count = agg._count._all;
  await db.product.update({
    where: { id: productId },
    data: {
      ratingCount: count,
      ratingAvg: count > 0 ? Math.round((agg._avg.rating ?? 0) * 10) / 10 : null,
    },
  });
}

export type PublicReview = {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  authorName: string;
  verifiedPurchase: boolean;
  createdAt: Date;
};

/** Approved reviews for a product, newest first. */
export async function getApprovedReviews(productId: string): Promise<PublicReview[]> {
  const reviews = await prisma.review.findMany({
    where: { productId, status: REVIEW_STATUSES.APPROVED },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      rating: true,
      title: true,
      body: true,
      authorName: true,
      verifiedPurchase: true,
      createdAt: true,
    },
  });
  return reviews.map((r) => ({ ...r, authorName: r.authorName?.trim() || "Customer" }));
}
