"use client";

import Link from "next/link";
import { useState } from "react";
import { BadgeCheck, Loader2, Star } from "lucide-react";
import { Stars } from "@/components/store/stars";
import { formatDate } from "@/lib/dates";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

type RecentReview = {
  id: string;
  rating: number;
  tasteRating: number | null;
  packingRating: number | null;
  deliveryRating: number | null;
  title: string | null;
  body: string | null;
  authorName: string;
  verifiedPurchase: boolean;
  createdAt: string;
  product: { name: string; slug: string } | null;
};

/**
 * Slim tab pinned to the right edge of every storefront page. Opens a panel of
 * the latest approved reviews (orders and products) — social proof that follows
 * the customer around instead of hiding on one product page. Data loads only
 * when it's opened.
 */
export function ReviewsTab() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [total, setTotal] = useState(0);
  const [reviews, setReviews] = useState<RecentReview[]>([]);

  async function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next || loaded || loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/reviews/recent");
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews ?? []);
        setTotal(data.total ?? 0);
        setLoaded(true);
      }
    } catch {
      // Leave it unloaded; reopening retries
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        aria-label="Read customer reviews"
        className="fixed right-0 top-1/2 z-40 flex -translate-y-1/2 items-center gap-1.5 rounded-l-lg bg-primary px-1.5 py-3 text-primary-foreground shadow-lg transition-[padding] hover:pr-2.5 print:hidden"
      >
        <Star className="size-3.5 shrink-0 fill-current" />
        <span className="text-xs font-semibold tracking-wide [writing-mode:vertical-rl]">
          Reviews
        </span>
      </button>

      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Customer reviews</SheetTitle>
            <SheetDescription>
              {total > 0
                ? `${total} review${total === 1 ? "" : "s"} from our customers — here are the latest.`
                : "What our customers are saying."}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-5 px-4 pb-6">
            {loading && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Loading reviews…
              </p>
            )}
            {loaded && reviews.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No reviews yet. Once your order arrives, you can review it from your order page.
              </p>
            )}
            {reviews.map((r) => (
              <div key={r.id} className="border-t pt-4 first:border-t-0 first:pt-0">
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
                    onClick={() => setOpen(false)}
                    className="mt-1 block text-sm font-semibold text-primary hover:underline"
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
                {r.title && <p className="mt-1 text-sm font-medium">{r.title}</p>}
                {r.body && (
                  <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{r.body}</p>
                )}
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {r.authorName} ·{" "}
                  {formatDate(r.createdAt)}
                </p>
              </div>
            ))}

            {loaded && (
              <Link
                href="/products"
                onClick={() => setOpen(false)}
                className="block rounded-lg border px-3 py-2 text-center text-sm font-medium hover:bg-accent"
              >
                Browse our sweets
              </Link>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
