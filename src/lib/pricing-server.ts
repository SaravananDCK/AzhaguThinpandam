import { Prisma } from "@prisma/client";
import { applyMarginPricing } from "@/lib/pricing";
import { getSettings } from "@/lib/queries";
import { SETTINGS } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

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

/**
 * Reprices every product that has a complete pricing rule (purchase ₹/kg +
 * margin %) from that rule, using the given rounding mode. Used by the
 * "Recalculate all prices" action so a change to the ₹5-rounding toggle can be
 * applied across the whole catalog in one shot. Runs in a single transaction so
 * SQLite sees one writer.
 */
export async function recomputeAllProducts(
  roundToFive: boolean
): Promise<{ productsUpdated: number; variantsUpdated: number }> {
  const products = await prisma.product.findMany({
    where: { purchasePricePerKg: { gt: 0 }, profitMarginPct: { not: null } },
    select: { id: true, purchasePricePerKg: true, profitMarginPct: true },
  });

  let productsUpdated = 0;
  let variantsUpdated = 0;

  await prisma.$transaction(
    async (tx) => {
      for (const p of products) {
        const n = await recomputeProductPrices(
          tx,
          p.id,
          p.purchasePricePerKg!,
          p.profitMarginPct!,
          roundToFive
        );
        if (n > 0) productsUpdated++;
        variantsUpdated += n;
      }
    },
    { maxWait: 20000, timeout: 30000 }
  );

  return { productsUpdated, variantsUpdated };
}
