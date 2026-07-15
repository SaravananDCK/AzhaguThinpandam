// Build-your-box tier discounts: buy N packs (any mix), get a percentage off
// the whole order. Tiers come from the `box_discount_tiers` setting as
// "packs:percent" pairs, e.g. "3:10,4:15,6:20". Pure helpers — safe on the
// client; the authoritative discount is computed server-side at checkout.

export type BoxTier = { count: number; percent: number };

export function parseBoxTiers(value: string | undefined | null): BoxTier[] {
  if (!value) return [];
  const tiers: BoxTier[] = [];
  for (const part of value.split(",")) {
    const m = part.trim().match(/^(\d+)\s*:\s*(\d+)$/);
    if (!m) continue;
    const count = parseInt(m[1], 10);
    const percent = parseInt(m[2], 10);
    if (count > 0 && percent > 0 && percent < 100) tiers.push({ count, percent });
  }
  return tiers.sort((a, b) => a.count - b.count);
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
