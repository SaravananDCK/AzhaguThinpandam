import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { Stars } from "@/components/store/stars";
import { formatDate } from "@/lib/dates";
import type { TopReview } from "@/lib/queries";

/**
 * Endless horizontal ticker of the top-rated reviews. Pure CSS: the list is
 * rendered twice side by side and the track slides left by half its width,
 * so the second copy takes over exactly where the first left off. Pauses on
 * hover; with reduced motion it becomes a plain scrollable row.
 */
export function ReviewsMarquee({ reviews }: { reviews: TopReview[] }) {
  if (reviews.length === 0) return null;
  // Keep the pace steady (~8s per card) however many reviews there are
  const duration = `${Math.max(20, reviews.length * 8)}s`;

  return (
    <div className="group relative -mx-4 overflow-hidden motion-reduce:overflow-x-auto">
      {/* Soft fade at both edges so cards don't clip harshly */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-background to-transparent motion-reduce:hidden" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-background to-transparent motion-reduce:hidden" />
      <div
        className="flex w-max animate-marquee py-1 group-hover:[animation-play-state:paused] motion-reduce:animate-none"
        style={{ animationDuration: duration }}
      >
        <ReviewList reviews={reviews} />
        <ReviewList reviews={reviews} hidden />
      </div>
    </div>
  );
}

function ReviewList({ reviews, hidden = false }: { reviews: TopReview[]; hidden?: boolean }) {
  return (
    <ul
      className={`flex shrink-0 gap-5 pr-5 ${hidden ? "motion-reduce:hidden" : ""}`}
      aria-hidden={hidden || undefined}
    >
      {reviews.map((r) => (
        <li
          key={r.id}
          className="flex w-72 shrink-0 flex-col rounded-2xl border bg-card p-5 shadow-sm sm:w-80"
        >
          <div className="flex items-center gap-2">
            <Stars value={r.rating} size={14} />
            {r.verifiedPurchase && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 dark:text-green-400">
                <BadgeCheck className="size-3.5" /> Verified
              </span>
            )}
          </div>
          {r.product && (
            <Link
              href={`/product/${r.product.slug}`}
              tabIndex={hidden ? -1 : undefined}
              className="mt-1 text-sm font-semibold text-primary hover:underline"
            >
              {r.product.name}
            </Link>
          )}
          {(r.tasteRating || r.packingRating || r.deliveryRating) && (
            <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
              {(
                [
                  ["Taste", r.tasteRating],
                  ["Packing", r.packingRating],
                  ["Delivery", r.deliveryRating],
                ] as const
              ).map(([label, v]) =>
                v ? (
                  <span key={label}>
                    {label} <span className="font-medium text-foreground">{v}★</span>
                  </span>
                ) : null
              )}
            </p>
          )}
          {r.title && <p className="mt-2 text-sm font-medium">{r.title}</p>}
          {r.body && (
            <p className="mt-1 line-clamp-4 whitespace-pre-line text-sm text-muted-foreground">
              {r.body}
            </p>
          )}
          <p className="mt-auto pt-3 text-xs text-muted-foreground">
            {r.authorName} · {formatDate(r.createdAt)}
          </p>
        </li>
      ))}
    </ul>
  );
}
