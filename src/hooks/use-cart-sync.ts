"use client";

import { useEffect, useRef, useState } from "react";
import { useCart, type CartAdjustment } from "@/lib/cart-store";

/**
 * Re-checks a persisted cart against live stock and prices once on mount, and
 * reports what had to change. Used by the cart and checkout pages so a customer
 * finds out an item ran out *there*, with the cart corrected in front of them,
 * instead of being rejected on the final click of checkout.
 */
export function useCartSync(enabled: boolean) {
  const items = useCart((s) => s.items);
  const syncAvailability = useCart((s) => s.syncAvailability);
  const [adjustments, setAdjustments] = useState<CartAdjustment[]>([]);
  const ran = useRef(false);

  useEffect(() => {
    if (!enabled || ran.current || items.length === 0) return;
    ran.current = true; // once per mount; re-entering the page re-checks
    const variantIds = items.map((i) => i.variantId);
    (async () => {
      try {
        const res = await fetch("/api/cart/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ variantIds }),
        });
        if (!res.ok) return;
        const data = await res.json();
        const changed = syncAvailability(data.items ?? []);
        if (changed.length) setAdjustments(changed);
      } catch {
        // Never block the page on this — checkout still validates server-side.
      }
    })();
  }, [enabled, items, syncAvailability]);

  return { adjustments, dismiss: () => setAdjustments([]) };
}

/** One human sentence per adjustment. */
export function describeAdjustment(a: CartAdjustment): string {
  const name = `${a.productName} (${a.variantLabel})`;
  if (a.kind === "removed") return `${name} is out of stock and was removed.`;
  if (a.kind === "reduced") return `${name} — only ${a.to} left, so the quantity was reduced.`;
  return `${name} — the price has changed since you added it.`;
}
