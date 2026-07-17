// Build-your-box tier discounts: buy a total weight, get a percentage off the
// whole order. Tiers come from the `box_discount_tiers` setting as "kg:percent"
// pairs, e.g. "1:10,2:15,3:20" (fractional kg allowed, e.g. "0.5:5"). Weight is
// used — not pack count — so 1 kg counts the same however it's split across
// variants (250 g / 500 g / 1 kg). Pure helpers — safe on the client; the
// authoritative discount is computed server-side at checkout.

import { gramsOf } from "@/lib/pricing";

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

/** Total weight in kg for a set of (variant label, qty) pairs. */
export function totalKg(items: { label: string; qty: number }[]): number {
  const grams = items.reduce((sum, i) => sum + (gramsOf(i.label) ?? 0) * i.qty, 0);
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
