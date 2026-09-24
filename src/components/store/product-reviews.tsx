import { BadgeCheck } from "lucide-react";
import { Stars } from "@/components/store/stars";
import type { PublicReview } from "@/lib/reviews";
import { formatDate } from "@/lib/dates";

/**
 * Approved reviews written for this product. New reviews are per order (asked
 * on the order page after delivery), so this is display-only and hides itself
 * when the product has none.
 */
export function ProductReviews({
  ratingAvg,
  ratingCount,
  reviews,
}: {
  ratingAvg: number | null;
  ratingCount: number;
  reviews: PublicReview[];
}) {
  if (reviews.length === 0) return null;

  return (
    <section id="reviews" className="mt-16 scroll-mt-24 border-t pt-10">
      <h2 className="font-heading text-xl font-bold">Customer reviews</h2>

      {ratingCount > 0 && (
        <div className="mt-3 flex items-center gap-3">
          <span className="text-3xl font-bold">{ratingAvg?.toFixed(1)}</span>
          <span>
            <Stars value={ratingAvg ?? 0} size={18} />
            <span className="mt-0.5 block text-sm text-muted-foreground">
              {ratingCount} review{ratingCount === 1 ? "" : "s"}
            </span>
          </span>
        </div>
      )}

      <ul className="mt-8 space-y-6">
        {reviews.map((r) => (
          <li key={r.id} className="border-t pt-6 first:border-t-0 first:pt-0">
            <div className="flex items-center gap-2">
              <Stars value={r.rating} size={15} />
              {r.verifiedPurchase && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 dark:text-green-400">
                  <BadgeCheck className="size-3.5" /> Verified purchase
                </span>
              )}
            </div>
            {r.title && <p className="mt-2 font-semibold">{r.title}</p>}
            {r.body && (
              <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {r.body}
              </p>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              {r.authorName} · {formatDate(r.createdAt)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
