"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  variantId: string;
  productSlug: string;
  productName: string;
  tamilName?: string | null;
  variantLabel: string;
  price: number; // paise
  image?: string | null;
  qty: number;
  maxStock: number;
  packetGrams?: number; // base packet size (200/250) for the delivery note
  // Both optional so carts saved before magnets existed still work: undefined
  // falls back to the old behaviour (weight from the label, treated as snacks).
  weightGrams?: number | null; // real pack weight, for shipping
  line?: string; // PRODUCT_LINES — only snacks earn the weight discount
};

type CartState = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "qty">, qty?: number) => void;
  removeItem: (variantId: string) => void;
  setQty: (variantId: string, qty: number) => void;
  clear: () => void;
  /** Reconciles the stored cart with live stock/price — see syncAvailability. */
  syncAvailability: (live: LiveAvailability[]) => CartAdjustment[];
};

export type LiveAvailability = {
  variantId: string;
  available: boolean;
  stock: number;
  price: number;
};

/** What changed during a sync, so the UI can tell the customer plainly. */
export type CartAdjustment = {
  variantId: string;
  productName: string;
  variantLabel: string;
  kind: "removed" | "reduced" | "repriced";
  /** New quantity for "reduced"; new unit price for "repriced". */
  to?: number;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item, qty = 1) =>
        set((state) => {
          const existing = state.items.find((i) => i.variantId === item.variantId);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.variantId === item.variantId
                  ? { ...i, qty: Math.min(i.qty + qty, i.maxStock) }
                  : i
              ),
            };
          }
          return { items: [...state.items, { ...item, qty: Math.min(qty, item.maxStock) }] };
        }),
      removeItem: (variantId) =>
        set((state) => ({ items: state.items.filter((i) => i.variantId !== variantId) })),
      setQty: (variantId, qty) =>
        set((state) => ({
          items:
            qty <= 0
              ? state.items.filter((i) => i.variantId !== variantId)
              : state.items.map((i) =>
                  i.variantId === variantId ? { ...i, qty: Math.min(qty, i.maxStock) } : i
                ),
        })),
      clear: () => set({ items: [] }),
      /**
       * Brings a persisted cart back in line with reality: drops items that
       * are gone, clamps quantities to what's actually in stock, and refreshes
       * the snapshotted price. Returns what it changed so the cart can say so
       * — silently altering someone's order would be worse than the dead end
       * this replaces.
       */
      syncAvailability: (live) => {
        const byId = new Map(live.map((l) => [l.variantId, l]));
        const adjustments: CartAdjustment[] = [];
        const next: CartItem[] = [];

        for (const item of get().items) {
          const l = byId.get(item.variantId);
          if (!l) {
            next.push(item); // not checked (shouldn't happen) — leave it alone
            continue;
          }
          const base = {
            variantId: item.variantId,
            productName: item.productName,
            variantLabel: item.variantLabel,
          };
          if (!l.available || l.stock <= 0) {
            adjustments.push({ ...base, kind: "removed" });
            continue;
          }
          const qty = Math.min(item.qty, l.stock);
          if (qty < item.qty) adjustments.push({ ...base, kind: "reduced", to: qty });
          if (l.price !== item.price) {
            adjustments.push({ ...base, kind: "repriced", to: l.price });
          }
          next.push({ ...item, qty, price: l.price, maxStock: l.stock });
        }

        if (adjustments.length) set({ items: next });
        return adjustments;
      },
    }),
    { name: "azhagu-cart" }
  )
);

export function cartCount(items: CartItem[]) {
  return items.reduce((sum, i) => sum + i.qty, 0);
}

export function cartSubtotal(items: CartItem[]) {
  return items.reduce((sum, i) => sum + i.price * i.qty, 0);
}
