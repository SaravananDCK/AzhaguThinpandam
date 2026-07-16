// Margin-based price rule: wholesale cost per kg + target margin % derive the
// sale price of every gram-labelled variant. Sale prices always round UP to
// the next ₹5 (₹86–89 → ₹90, ₹81–84 → ₹85) so the margin is a floor, never
// undercut. The smallest pack anchors the per-gram rate; larger packs get the
// standard bulk discounts, with the exact linear price stored as mrp.

export const BULK_DISCOUNTS: Record<number, number> = { 500: 0.05, 1000: 0.1 };

export function gramsOf(label: string): number | null {
  const m = label.trim().match(/^(\d+(?:\.\d+)?)\s*(g|kg)$/i);
  if (!m) return null;
  return m[2].toLowerCase() === "kg" ? parseFloat(m[1]) * 1000 : parseFloat(m[1]);
}

export type PricedVariant = { price: number; mrp: number | null };

/**
 * Computes prices (paise) for each variant label from the pricing rule.
 * Labels that aren't weights (e.g. "Combo") return null — left untouched.
 * `roundToFive` (store setting): true = ceil sale prices to the next ₹5,
 * false = exact to the nearest ₹1.
 */
export function applyMarginPricing(
  labels: string[],
  purchasePricePerKg: number, // paise
  profitMarginPct: number,
  opts: { roundToFive?: boolean } = {}
): (PricedVariant | null)[] {
  const grams = labels.map(gramsOf);
  const weighted = grams
    .map((g, i) => ({ g, i }))
    .filter((x): x is { g: number; i: number } => x.g !== null)
    .sort((a, b) => a.g - b.g);
  if (!weighted.length) return labels.map(() => null);

  const roundToFive = opts.roundToFive ?? true;
  const roundPrice = roundToFive
    ? (paise: number) => Math.max(500, Math.ceil(paise / 500) * 500) // ceil to next ₹5
    : (paise: number) => Math.max(100, Math.round(paise / 100) * 100); // nearest ₹1

  const retailPerGram = (purchasePricePerKg * (1 + profitMarginPct / 100)) / 1000;
  const baseGrams = weighted[0].g;
  const basePrice = roundPrice(retailPerGram * baseGrams);
  const perGram = basePrice / baseGrams;

  return grams.map((g) => {
    if (g === null) return null;
    if (g === baseGrams) return { price: basePrice, mrp: null };
    const linear = Math.round((perGram * g) / 100) * 100; // exact — shown as MRP
    const discount = BULK_DISCOUNTS[g];
    if (!discount) return { price: roundPrice(linear), mrp: null };
    return { price: roundPrice(linear * (1 - discount)), mrp: linear };
  });
}
