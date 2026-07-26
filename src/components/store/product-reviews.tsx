import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { Stars } from "@/components/store/stars";
import { ReviewForm } from "@/components/store/review-form";
import type { PublicReview } from "@/lib/reviews";

type ExistingReview = {
  rating: number;
  title: string | null;
  body: string | null;
  status: string;
} | null;

export function ProductReviews({
  productId,
  productSlug,
  ratingAvg,
  ratingCount,
  reviews,
  loggedIn,
  purchased,
  existing,
}: {
  productId: string;
  productSlug: string;
  ratingAvg: number | null;
  ratingCount: number;
  reviews: PublicReview[];
  loggedIn: boolean;
  purchased: boolean;
  existing: ExistingReview;
}) {
  return (
    <section id="reviews" className="mt-16 scroll-mt-24 border-t pt-10">
      <h2 className="font-heading text-xl font-bold">Customer reviews</h2>

      <div className="mt-3 flex items-center gap-3">
        {ratingCount > 0 ? (
          <>
            <span className="text-3xl font-bold">{ratingAvg?.toFixed(1)}</span>
            <span>
              <Stars value={ratingAvg ?? 0} size={18} />
              <span className="mt-0.5 block text-sm text-muted-foreground">
                {ratingCount} review{ratingCount === 1 ? "" : "s"}
              </span>
            </span>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            No reviews yet — be the first to review this after your purchase.
          </p>
        )}
      </div>

      {/* Write-a-review area, gated to verified purchasers */}
      <div className="mt-6 max-w-xl">
        {!loggedIn ? (
          <div className="rounded-xl border bg-secondary/30 p-4 text-sm">
            Bought this product?{" "}
            <Link
              href={`/login?callbackUrl=/product/${productSlug}`}
              className="font-semibold text-primary underline-offset-2 hover:underline"
            >
              Sign in
            </Link>{" "}
            to write a review.
          </div>
        ) : purchased ? (
          <ReviewForm productId={productId} existing={existing} />
        ) : (
          <p className="rounded-xl border bg-secondary/30 p-4 text-sm text-muted-foreground">
            Only customers who have purchased this product can review it.
          </p>
        )}
      </div>

      {/* Approved reviews */}
      {reviews.length > 0 && (
        <ul className="mt-8 space-y-6">
          {reviews.map((r) => (
            <li key={r.id} className="border-t pt-6 first:border-t-0 first:pt-0">
              <div className="flex items-center gap-2">
                <Stars value={r.rating} size={15} />
                <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 dark:text-green-400">
                  <BadgeCheck className="size-3.5" /> Verified purchase
                </span>
              </div>
              {r.title && <p className="mt-2 font-semibold">{r.title}</p>}
              {r.body && (
                <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {r.body}
                </p>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                {r.authorName} ·{" "}
                {new Date(r.createdAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
