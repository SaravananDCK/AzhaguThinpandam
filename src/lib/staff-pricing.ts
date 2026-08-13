// Staff pricing: employees buy at wholesale cost + ₹5 per physical packet
// instead of retail. A 250 g pack of a product costing ₹240/kg is ₹60 of goods,
// so staff pay ₹65; the same product's 1 kg pack ships as 4 × 250 g pouches, so
// it is ₹240 + 4 × ₹5 = ₹260.
//
// Computed, never stored — the staff price follows `purchasePricePerKg`
// automatically, so changing a wholesale cost needs no recalculation step.
//
// Known caveats (documented on purpose, not bugs to fix here):
//  · The cart snapshots `price` when an item is added (see cart-store.ts), so
//    items already in a cart keep their old price if the staff flag changes.
//    The server re-prices from variantId + qty at checkout and always charges
//    correctly — the displayed number can be stale, the charge cannot.
//  · `basePacketGrams` reads the product's ACTIVE variants, so a product whose
//    only active variant is the 1 kg one bills a single packet. Accepted: the
//    surcharge then matches the "Delivered as N × 250 g packets" note the buyer
//    is actually shown.

import { basePacketGrams, labelToGrams } from "@/lib/pack";

/** Flat markup over wholesale, per physical packet, in paise. */
export const STAFF_MARKUP_PER_PACKET = 500; // ₹5

type StaffVariant = {
  label: string;
  price: number; // retail, paise
  weightGrams: number | null;
  unitCost: number | null; // wholesale paise PER UNIT
};

type StaffProduct = {
  purchasePricePerKg: number | null; // paise per kg
  variants: { label: string }[]; // the product's active variants
};

/** Up to the next whole rupee — never below cost + ₹5, and never shows paise. */
const ceilRupee = (paise: number) => Math.ceil(paise / 100) * 100;

/**
 * What an employee pays for one unit of this variant. Falls back to the retail
 * price when the wholesale cost is unknown (never guesses), and is capped at
 * retail so a clearance price or a misconfigured margin can't make staff pay
 * more than a customer.
 */
export function staffUnitPrice(variant: StaffVariant, product: StaffProduct): number {
  const raw = rawStaffPrice(variant, product);
  return raw === null ? variant.price : Math.min(ceilRupee(raw), variant.price);
}

function rawStaffPrice(variant: StaffVariant, product: StaffProduct): number | null {
  // Merchandise is bought per unit, and one unit is one packet. Zero means
  // "no cost recorded", not "free" — same reading as order-cost.ts.
  if (variant.unitCost != null && variant.unitCost > 0) {
    return variant.unitCost + STAFF_MARKUP_PER_PACKET;
  }

  const perKg = product.purchasePricePerKg;
  const grams = variant.weightGrams ?? labelToGrams(variant.label);
  if (perKg == null || perKg <= 0 || grams == null) return null;

  const packetGrams = basePacketGrams(product.variants.map((v) => v.label));
  const packets = Math.max(1, Math.round(grams / packetGrams));
  // Same expression as order-cost.ts, so the admin margin panel shows exactly
  // ₹5 per packet (plus the sub-rupee rounding remainder) on a staff line.
  const cost = Math.round((perKg * grams) / 1000);
  return cost + STAFF_MARKUP_PER_PACKET * packets;
}
