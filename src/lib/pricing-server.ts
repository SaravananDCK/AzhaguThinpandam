import { Prisma } from "@prisma/client";
import { applyMarginPricing } from "@/lib/pricing";
import { getSettings } from "@/lib/queries";
import { SETTINGS } from "@/lib/constants";

export async function priceRoundingIsFive(): Promise<boolean> {
  const settings = await getSettings();
  return settings[SETTINGS.ROUND_TO_FIVE] !== "0";
}

/**
 * Recomputes and saves a product's active variant prices from its pricing rule
 * (purchase ₹/kg + margin %). Returns how many variants were repriced. Weight-
 * less variant labels (e.g. "Combo") are left untouched.
 */
export async function recomputeProductPrices(
  tx: Prisma.TransactionClient,
  productId: string,
  purchasePricePerKg: number, // paise
  profitMarginPct: number,
  roundToFive: boolean
): Promise<number> {
  const variants = await tx.productVariant.findMany({
    where: { productId, isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  const priced = applyMarginPricing(
    variants.map((v) => v.label),
    purchasePricePerKg,
    profitMarginPct,
    { roundToFive }
  );
  let count = 0;
  for (const [i, p] of priced.entries()) {
    if (!p) continue;
    await tx.productVariant.update({
      where: { id: variants[i].id },
      data: { price: p.price, mrp: p.mrp },
    });
    count++;
  }
  return count;
}
