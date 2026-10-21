"use client";

import Link from "next/link";
import { CalendarClock, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AnnouncementDialog } from "@/components/store/announcement-dialog";
import { dismissPopup, useDismissed } from "@/components/store/use-dismissed";
import type { Announcement } from "@/lib/announcement";
import { formatINR } from "@/lib/money";
import { PREORDER_DELIVERY_NOTE } from "@/lib/preorder";
import type { PreorderPopup } from "@/lib/preorder-popup";

const PREORDER_KEY = "preorder-popup-dismissed";

/**
 * Arrival pop-ups, one at a time: the pre-order combos first (while booking is
 * open), then the store announcement once that is closed — never two stacked.
 */
export function LandingDialogs({
  preorder,
  announcement,
}: {
  preorder: PreorderPopup | null;
  announcement: Announcement | null;
}) {
  const preorderDismissed = useDismissed(PREORDER_KEY, preorder?.id ?? "");
  if (preorder && !preorderDismissed) return <PreorderDialog popup={preorder} />;
  return announcement ? <AnnouncementDialog announcement={announcement} /> : null;
}

function PreorderDialog({ popup }: { popup: PreorderPopup }) {
  const close = () => dismissPopup(PREORDER_KEY, popup.id);
  const single = popup.products.length === 1;

  return (
    <Dialog open onOpenChange={(next) => !next && close()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto p-5 sm:max-w-2xl" showCloseButton>
        <DialogHeader className="items-center text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-gold-700 dark:text-gold-400">
            Pre-orders open
          </p>
          <DialogTitle className="font-heading text-2xl font-semibold text-primary sm:text-3xl">
            Diwali Special Combos
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-foreground/80">
            {popup.dispatchNote || "Book now, delivered in time for the festival."}
          </DialogDescription>
        </DialogHeader>

        <div className={`grid gap-3 ${single ? "mx-auto max-w-xs" : "grid-cols-2"}`}>
          {popup.products.map((p) => (
            <Link
              key={p.slug}
              href={`/product/${p.slug}`}
              onClick={close}
              className="group overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-lg"
            >
              <div className="aspect-square overflow-hidden bg-muted">
                {p.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.image}
                    alt={p.name}
                    className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                )}
              </div>
              <div className="space-y-1 p-3">
                <p className="text-sm font-semibold leading-snug">{p.name}</p>
                <p className="text-lg font-bold text-primary-600 dark:text-primary-400">
                  {formatINR(p.price)}
                </p>
                <span className="flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-primary-600 to-primary-700 py-2 text-xs font-bold text-white sm:text-sm">
                  View &amp; pre-order
                </span>
              </div>
            </Link>
          ))}
        </div>

        <ul className="space-y-1.5 text-sm text-muted-foreground">
          {popup.deadline && (
            <li className="flex items-center gap-2">
              <CalendarClock className="size-4 shrink-0 text-primary" />
              {popup.deadline}.
            </li>
          )}
          <li className="flex items-center gap-2">
            <Truck className="size-4 shrink-0 text-primary" />
            {PREORDER_DELIVERY_NOTE}
          </li>
        </ul>

        <Button variant="ghost" className="mx-auto rounded-full" onClick={close}>
          Maybe later
        </Button>
      </DialogContent>
    </Dialog>
  );
}
