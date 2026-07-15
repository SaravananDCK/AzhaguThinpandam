// Larger sizes ship as multiple 250 g packets (e.g. 1 kg = 4 × 250 g).
const PACKET_GRAMS = 250;

function labelToGrams(label: string): number | null {
  const m = label.trim().match(/^(\d+(?:\.\d+)?)\s*(g|kg)$/i);
  if (!m) return null;
  const value = parseFloat(m[1]);
  return m[2].toLowerCase() === "kg" ? value * 1000 : value;
}

/** "500 g" → "2 × 250 g packets"; single packets (≤250 g) return null. */
export function packNote(label: string): string | null {
  const grams = labelToGrams(label);
  if (!grams || grams <= PACKET_GRAMS || grams % PACKET_GRAMS !== 0) return null;
  return `${grams / PACKET_GRAMS} × ${PACKET_GRAMS} g packets`;
}
