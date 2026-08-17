"use client";

import { AlertTriangle, X } from "lucide-react";
import { describeAdjustment } from "@/hooks/use-cart-sync";
import type { CartAdjustment } from "@/lib/cart-store";

/** Tells the customer exactly what the cart re-check changed, and why. */
export function CartAdjustmentsNotice({
  adjustments,
  onDismiss,
}: {
  adjustments: CartAdjustment[];
  onDismiss: () => void;
}) {
  if (adjustments.length === 0) return null;
  return (
    <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-100">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="font-medium">Your cart was updated</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-4">
          {adjustments.map((a, i) => (
            <li key={`${a.variantId}-${a.kind}-${i}`}>{describeAdjustment(a)}</li>
          ))}
        </ul>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="shrink-0 text-amber-700 hover:text-amber-900 dark:text-amber-300"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
