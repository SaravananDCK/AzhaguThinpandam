// Shipping fee math. Client-safe (no prisma import) so the checkout summary and
// the server compute the fee identically. All amounts in paise.
//
// Inside Tamil Nadu (and Puducherry, which the same couriers serve at the same
// rate): flat fee, free once the (after-discount) order clears the threshold.
// Everywhere else: charged by weight (rounded up to the next whole kg) on every
// order — no free shipping. Kerala, Karnataka and Telangana each have their own
// ₹/kg (nearer, cheaper couriers); every other state and UT uses the "outside"
// rate.

export const STATE_ZONES = ["kerala", "karnataka", "telangana"] as const;
export type StateZone = (typeof STATE_ZONES)[number];
export type ShippingZone = "tn" | StateZone | "other";

export type ShippingConfig = {
  shippingFee: number; // inside TN flat fee (paise)
  freeShippingAbove: number; // inside TN free-shipping threshold (paise); 0 disables
  outsideTnPerKg: number; // every state without its own rate, paise per kg
  statePerKg: Record<StateZone, number>; // Kerala / Karnataka / Telangana, paise per kg
};

// Puducherry (Pondicherry) is treated as Tamil Nadu: same couriers, same
// flat fee, same free-shipping threshold.
const TAMIL_NADU = /^(tamil\s*nadu|tamilnadu|tn|puducherry|pondicherry|pondy)$/i;

/** True for Tamil Nadu and Puducherry — the flat-fee / free-above zone. */
export function isTamilNadu(state: string | null | undefined): boolean {
  return TAMIL_NADU.test((state ?? "").trim());
}

const ZONE_LABELS: Record<ShippingZone, string> = {
  tn: "Tamil Nadu / Puducherry",
  kerala: "Kerala",
  karnataka: "Karnataka",
  telangana: "Telangana",
  other: "Outside Tamil Nadu",
};

export function shippingZone(state: string | null | undefined): ShippingZone {
  if (isTamilNadu(state)) return "tn";
  const s = (state ?? "").trim().toLowerCase();
  if (s === "kerala") return "kerala";
  if (s === "karnataka") return "karnataka";
  if (s === "telangana") return "telangana";
  return "other";
}

export function zoneLabel(zone: ShippingZone): string {
  return ZONE_LABELS[zone];
}

/** ₹/kg (paise) that applies to a delivery state; 0 inside Tamil Nadu (flat fee there). */
export function perKgFor(state: string | null | undefined, config: ShippingConfig): number {
  const zone = shippingZone(state);
  if (zone === "tn") return 0;
  if (zone === "other") return config.outsideTnPerKg;
  return config.statePerKg[zone];
}

/** Weight rounded up to the whole kg used for weight-based pricing. */
export function billableKg(weightKg: number): number {
  return weightKg > 0 ? Math.max(1, Math.ceil(weightKg)) : 0;
}

export function computeShipping(params: {
  state: string | null | undefined;
  weightKg: number;
  subtotal: number; // after-discount order value (paise)
  config: ShippingConfig;
}): number {
  const { state, weightKg, subtotal, config } = params;
  if (isTamilNadu(state)) {
    if (config.freeShippingAbove > 0 && subtotal >= config.freeShippingAbove) return 0;
    return config.shippingFee;
  }
  // Outside Tamil Nadu — always weight-based, never free.
  return billableKg(weightKg) * perKgFor(state, config);
}
