"use client";

import { useEffect, useRef } from "react";
import { useCart } from "@/lib/cart-store";
import { useAuthed } from "@/hooks/use-authed";

/**
 * Mirrors the browser cart to the server whenever it changes (debounced), so
 * an abandoned cart is visible in the admin panel. Mounted once in the store
 * layout; does nothing until the session check says the customer is logged in.
 * Clearing the cart (order placed) syncs too, removing the mirror — a placed
 * order must not linger as a "pending cart".
 */
export function CartSyncBridge() {
  const items = useCart((s) => s.items);
  const authed = useAuthed((s) => s.authed);
  const check = useAuthed((s) => s.check);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Skips the first sync after login/mount when the cart is empty — nothing
  // to mirror and nothing to clear.
  const everHadItems = useRef(false);

  useEffect(() => {
    void check();
  }, [check]);

  useEffect(() => {
    if (authed !== true) return;
    if (items.length === 0 && !everHadItems.current) return;
    everHadItems.current = everHadItems.current || items.length > 0;

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void fetch("/api/cart", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ variantId: i.variantId, qty: i.qty })),
        }),
      }).catch(() => {
        // Mirror only — never bother the customer about it. The next cart
        // change retries naturally.
      });
    }, 1200);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [items, authed]);

  return null;
}
