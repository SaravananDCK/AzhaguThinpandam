// Build-your-box tier discounts: buy a total weight, get a percentage off the
// whole order. Tiers come from the `box_discount_tiers` setting as "kg:percent"
// pairs, e.g. "1:10,2:15,3:20" (fractional kg allowed, e.g. "0.5:5"). Weight is
// used — not pack count — so 1 kg counts the same however it's split across
// variants (250 g / 500 g / 1 kg). Pure helpers — safe on the client; the
// authoritative discount is computed server-side at checkout.

import { gramsOf } from "@/lib/pricing";
import { WEIGHT_DISCOUNT_LINES, type ProductLine } from "@/lib/constants";

export type BoxTier = { count: number; percent: number }; // count = kilograms

export function parseBoxTiers(value: string | undefined | null): BoxTier[] {
  if (!value) return [];
  const tiers: BoxTier[] = [];
  for (const part of value.split(",")) {
    const m = part.trim().match(/^(\d+(?:\.\d+)?)\s*:\s*(\d+)$/);
    if (!m) continue;
    const count = parseFloat(m[1]);
    const percent = parseInt(m[2], 10);
    if (count > 0 && percent > 0 && percent < 100) tiers.push({ count, percent });
  }
  return tiers.sort((a, b) => a.count - b.count);
}

/**
 * Weight of one pack in grams. An explicit `weightGrams` always wins; the label
 * is only a fallback for snack packs named by weight ("250 g").
 *
 * Merchandise labels ("Single", "Set of 4") parse to nothing, so without an
 * explicit weight such an item weighs zero — and a zero-weight order ships free
 * outside Tamil Nadu, where the fee is weight × ₹/kg.
 */
export function packGrams(item: { label: string; weightGrams?: number | null }): number {
  return item.weightGrams ?? gramsOf(item.label) ?? 0;
}

/** Total weight in kg for a set of packs. */
export function totalKg(
  items: { label: string; qty: number; weightGrams?: number | null }[]
): number {
  const grams = items.reduce((sum, i) => sum + packGrams(i) * i.qty, 0);
  return grams / 1000;
}

/** "1.5 kg" — trims trailing zeros so whole kilos read as "2 kg". */
export function formatKg(kg: number): string {
  return `${Number(kg.toFixed(2))} kg`;
}

/** Highest tier unlocked by `count` packs, or null. */
export function activeTier(tiers: BoxTier[], count: number): BoxTier | null {
  let active: BoxTier | null = null;
  for (const t of tiers) if (count >= t.count) active = t;
  return active;
}

/** The next tier still locked at `count` packs, or null if maxed out. */
export function nextTier(tiers: BoxTier[], count: number): BoxTier | null {
  for (const t of tiers) if (count < t.count) return t;
  return null;
}

/** Discount in paise for a subtotal at `count` packs. */
export function boxDiscount(tiers: BoxTier[], count: number, subtotal: number): number {
  const tier = activeTier(tiers, count);
  if (!tier) return 0;
  return Math.round((subtotal * tier.percent) / 100);
}

/**
 * Client-side mirror of the server's weight/discount split (priceOrderLines).
 * The cart and checkout summaries must agree with what checkout actually
 * charges, so both use the same rule: every pack counts toward shipping weight,
 * but only snacks earn — or receive — the bundle discount.
 */
export function cartWeights(
  items: { variantLabel: string; qty: number; weightGrams?: number | null; line?: string; price: number }[]
) {
  const shippingKg = totalKg(
    items.map((i) => ({ label: i.variantLabel, qty: i.qty, weightGrams: i.weightGrams }))
  );
  const food = items.filter((i) => WEIGHT_DISCOUNT_LINES.includes((i.line ?? "SNACKS") as ProductLine));
  const foodKg = totalKg(
    food.map((i) => ({ label: i.variantLabel, qty: i.qty, weightGrams: i.weightGrams }))
  );
  const foodSubtotal = food.reduce((s, i) => s + i.price * i.qty, 0);
  return { shippingKg, foodKg, foodSubtotal };
}
