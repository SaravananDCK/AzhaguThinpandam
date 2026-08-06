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

// ---------------------------------------------------------------------------
// Goodie tiers — the "goodies" discount type. Instead of a percent off, the
// cart's snack weight unlocks free products. Config comes from the
// `goodie_tiers` setting as JSON rows; several rows may share a kg threshold
// (that tier then gives all of them), and only the highest reached tier
// applies — tiers never stack.

export type GoodieTier = { kg: number; variantId: string; qty: number };

/** Parses the goodie_tiers JSON setting. Bad JSON / bad rows are dropped. */
export function parseGoodieTiers(value: string | undefined | null): GoodieTier[] {
  if (!value) return [];
  try {
    const raw: unknown = JSON.parse(value);
    if (!Array.isArray(raw)) return [];
    return raw
      .filter(
        (r): r is GoodieTier =>
          !!r &&
          typeof r === "object" &&
          typeof (r as GoodieTier).kg === "number" &&
          Number.isFinite((r as GoodieTier).kg) &&
          (r as GoodieTier).kg > 0 &&
          typeof (r as GoodieTier).variantId === "string" &&
          (r as GoodieTier).variantId.length > 0 &&
          Number.isInteger((r as GoodieTier).qty) &&
          (r as GoodieTier).qty >= 1 &&
          (r as GoodieTier).qty <= 99
      )
      .sort((a, b) => a.kg - b.kg);
  } catch {
    return [];
  }
}

/** Highest goodie threshold unlocked at `kg`, or null. (Mirrors activeTier.) */
export function activeGoodieKg(tiers: GoodieTier[], kg: number): number | null {
  let active: number | null = null;
  for (const t of tiers) if (kg >= t.kg) active = t.kg;
  return active;
}

/** The next still-locked goodie threshold, or null when maxed out. */
export function nextGoodieKg(tiers: GoodieTier[], kg: number): number | null {
  for (const t of tiers) if (kg < t.kg) return t.kg;
  return null;
}

/** Rows of the single active tier — highest tier only, tiers never stack. */
export function goodiesForKg<T extends GoodieTier>(tiers: T[], kg: number): T[] {
  const active = activeGoodieKg(tiers, kg);
  return active === null ? [] : tiers.filter((t) => t.kg === active);
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
