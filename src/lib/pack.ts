// Larger sizes ship as multiple base-size packets (e.g. a 200 g product's 1 kg
// = 5 × 200 g; a 250 g product's 1 kg = 4 × 250 g). The base packet size is the
// product's smallest weight variant.
const DEFAULT_PACKET_GRAMS = 250;

function labelToGrams(label: string): number | null {
  const m = label.trim().match(/^(\d+(?:\.\d+)?)\s*(g|kg)$/i);
  if (!m) return null;
  const value = parseFloat(m[1]);
  return m[2].toLowerCase() === "kg" ? value * 1000 : value;
}

/** A product's base packet size = its smallest weight variant (e.g. 200 or 250). */
export function basePacketGrams(labels: string[]): number {
  const grams = labels.map(labelToGrams).filter((g): g is number => g !== null);
  return grams.length ? Math.min(...grams) : DEFAULT_PACKET_GRAMS;
}

/**
 * "600 g" with packet 200 → "3 × 200 g packets". Single packets (≤ base) return
 * null. `packetGrams` is the product's base packet; when omitted it's inferred
 * from the label (multiples of 200-not-250 → 200, else 250) — exact except for
 * sizes that are multiples of both (e.g. 1 kg), which default to 250.
 */
export function packNote(label: string, packetGrams?: number): string | null {
  const grams = labelToGrams(label);
  if (!grams) return null;
  let packet = packetGrams;
  if (!packet) packet = grams % 200 === 0 && grams % 250 !== 0 ? 200 : DEFAULT_PACKET_GRAMS;
  if (grams <= packet || grams % packet !== 0) return null;
  return `${grams / packet} × ${packet} g packets`;
}
