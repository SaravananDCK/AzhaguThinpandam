import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// The cart, kept on the phone between launches. It holds what the customer
// chose and a snapshot for display; real prices and totals always come from
// the server (/api/v1/cart/price) so the app can never undercharge.

export type CartItem = {
  variantId: string;
  productSlug: string;
  productName: string;
  variantLabel: string;
  price: number; // paise, as last seen
  image: string | null;
  qty: number;
  maxQty: number;
  /** Pre-order combo — never shares a cart with regular items */
  preorder: boolean;
};

export const PREORDER_MIX_MESSAGE =
  'Pre-order combos are booked and shipped on their own. Please check out your current cart first, then add this.';

type CartState = {
  items: CartItem[];
  /** False when refused: pre-orders and regular items can't share a cart. */
  addItem: (item: Omit<CartItem, 'qty'>, qty?: number) => boolean;
  setQty: (variantId: string, qty: number) => void;
  removeItem: (variantId: string) => void;
  clear: () => void;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item, qty = 1) => {
        // The server enforces the same rule; refusing here says so sooner
        if (get().items.some((i) => i.preorder !== item.preorder)) return false;
        set((state) => {
          const existing = state.items.find((i) => i.variantId === item.variantId);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.variantId === item.variantId
                  ? { ...i, ...item, qty: Math.min(i.qty + qty, item.maxQty) }
                  : i,
              ),
            };
          }
          return { items: [...state.items, { ...item, qty: Math.min(qty, item.maxQty) }] };
        });
        return true;
      },
      setQty: (variantId, qty) =>
        set((state) => ({
          items:
            qty <= 0
              ? state.items.filter((i) => i.variantId !== variantId)
              : state.items.map((i) =>
                  i.variantId === variantId ? { ...i, qty: Math.min(qty, i.maxQty) } : i,
                ),
        })),
      removeItem: (variantId) =>
        set((state) => ({ items: state.items.filter((i) => i.variantId !== variantId) })),
      clear: () => set({ items: [] }),
    }),
    { name: 'azhagu-cart', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

export function cartCount(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.qty, 0);
}
