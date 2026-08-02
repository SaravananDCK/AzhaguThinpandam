// Shipping fee math. Client-safe (no prisma import) so the checkout summary and
// the server compute the fee identically. All amounts in paise.
//
// Inside Tamil Nadu: flat fee, free once the (after-discount) order clears the
// threshold. Outside Tamil Nadu: charged by weight (rounded up to the next whole
// kg) on every order — no free shipping.

export type ShippingConfig = {
  shippingFee: number; // inside TN flat fee (paise)
  freeShippingAbove: number; // inside TN free-shipping threshold (paise); 0 disables
  outsideTnPerKg: number; // outside TN, paise per kg
};

const TAMIL_NADU = /^(tamil\s*nadu|tamilnadu|tn)$/i;

export function isTamilNadu(state: string | null | undefined): boolean {
  return TAMIL_NADU.test((state ?? "").trim());
}

/** Weight rounded up to the whole kg used for outside-TN pricing. */
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
  return billableKg(weightKg) * config.outsideTnPerKg;
}
