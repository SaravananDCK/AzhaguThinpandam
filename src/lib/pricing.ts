// Margin-based price rule: wholesale cost per kg + target margin % derive the
// sale price of every gram-labelled variant. The smallest pack anchors the
// per-gram rate (rounded to a friendly ₹5); larger packs get the standard
// bulk discounts off the linear price, with the undiscounted linear price
// stored as mrp for the strike-through display.

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
 */
export function applyMarginPricing(
  labels: string[],
  purchasePricePerKg: number, // paise
  profitMarginPct: number
): (PricedVariant | null)[] {
  const grams = labels.map(gramsOf);
  const weighted = grams
    .map((g, i) => ({ g, i }))
    .filter((x): x is { g: number; i: number } => x.g !== null)
    .sort((a, b) => a.g - b.g);
  if (!weighted.length) return labels.map(() => null);

  const retailPerGram = (purchasePricePerKg * (1 + profitMarginPct / 100)) / 1000;
  const baseGrams = weighted[0].g;
  // Anchor: smallest pack rounded to the nearest ₹5
  const basePrice = Math.max(500, Math.round((retailPerGram * baseGrams) / 500) * 500);
  const perGram = basePrice / baseGrams;

  return grams.map((g) => {
    if (g === null) return null;
    if (g === baseGrams) return { price: basePrice, mrp: null };
    const linear = Math.round((perGram * g) / 100) * 100;
    const discount = BULK_DISCOUNTS[g];
    if (!discount) return { price: linear, mrp: null };
    return { price: Math.round((linear * (1 - discount)) / 100) * 100, mrp: linear };
  });
}
