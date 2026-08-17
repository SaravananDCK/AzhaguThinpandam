// Whether an item can be sold right now, in one place so no surface drifts.
//
// Most products are made fresh in batches (Product.madeToOrder), so their stock
// count is a running tally rather than a limit — it may even go negative, which
// reads as "packs owed". Merchandise leaves the flag off and genuinely runs out.
//
// Every storefront availability test, quantity cap and the server's checkout
// gate route through these two functions.

/**
 * Per-line quantity ceiling. Matches checkoutSchema's `qty.max(99)` in
 * orders.ts — the real bound on any single order line, made-to-order or not.
 */
export const MAX_LINE_QTY = 99;

/** Can this variant be added to a cart / ordered? */
export function isSellable(stock: number, madeToOrder: boolean): boolean {
  return madeToOrder || stock > 0;
}

/**
 * The largest quantity a customer may take of this variant. Made-to-order items
 * are bounded only by the per-line cap; everything else by what's on the shelf
 * (never negative, so a variant that has oversold reads as 0 rather than
 * enabling a nonsensical negative cap).
 */
export function sellableQty(stock: number, madeToOrder: boolean): number {
  return madeToOrder ? MAX_LINE_QTY : Math.max(0, stock);
}
