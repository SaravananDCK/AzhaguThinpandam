import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { ReviewsGrid } from "@/components/admin/reviews-grid";

export const metadata: Metadata = { title: "Reviews" };

export default async function AdminReviewsPage() {
  const pending = await prisma.review.count({ where: { status: "PENDING" } });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-2xl font-bold">Reviews</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Customer reviews from verified purchasers.{" "}
          {pending > 0 ? (
            <span className="font-medium text-amber-700 dark:text-amber-400">
              {pending} awaiting approval.
            </span>
          ) : (
            "Approved reviews show on the product page; approve or hide new ones below."
          )}
        </p>
      </div>
      <ReviewsGrid />
    </div>
  );
}
