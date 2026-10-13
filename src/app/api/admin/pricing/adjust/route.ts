import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin";
import { marginFromBasePrice } from "@/lib/pricing";

// Moves every pack price in the chosen categories by a fixed ₹ amount or a
// percentage, then re-derives each product's margin from its new base-pack
// price so the Margin % column stays true. The pricing rule itself (purchase
// ₹/kg) is untouched — this is a sale-price decision, not a cost change.
const bodySchema = z.object({
  categoryIds: z.array(z.string().min(1)).min(1).max(100),
  mode: z.enum(["rupees", "percent"]),
  /** ₹ per pack, or %. Negative lowers prices. */
  amount: z.number().min(-10000).max(10000),
});

export async function POST(req: NextRequest) {
  const { response } = await requireAdminApi();
  if (response) return response;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || parsed.data.amount === 0) {
    return NextResponse.json({ error: "Pick the categories and a non-zero amount." }, { status: 400 });
  }
  const { categoryIds, mode, amount } = parsed.data;

  const products = await prisma.product.findMany({
    where: { categoryId: { in: categoryIds } },
    select: {
      id: true,
      name: true,
      purchasePricePerKg: true,
      variants: {
        where: { isActive: true },
        select: { id: true, label: true, price: true, mrp: true, weightGrams: true },
      },
    },
  });

  const shift = (paise: number) =>
    mode === "rupees"
      ? paise + Math.round(amount * 100)
      : Math.round((paise * (1 + amount / 100)) / 100) * 100; // % keeps whole rupees

  // Refuse the whole batch if any pack would drop below ₹1 — a half-applied
  // decrease is worse than none.
  const tooLow = products.flatMap((p) =>
    p.variants.filter((v) => shift(v.price) < 100).map((v) => `${p.name} (${v.label})`)
  );
  if (tooLow.length) {
    return NextResponse.json(
      { error: `That would take these below ₹1: ${tooLow.slice(0, 5).join(", ")}${tooLow.length > 5 ? "…" : ""}` },
      { status: 400 }
    );
  }

  let variantsUpdated = 0;
  await prisma.$transaction(
    async (tx) => {
      for (const p of products) {
        for (const v of p.variants) {
          await tx.productVariant.update({
            where: { id: v.id },
            // The strike-through moves with the price so the "% off" shown
            // to customers stays the same
            data: { price: shift(v.price), mrp: v.mrp == null ? null : shift(v.mrp) },
          });
          variantsUpdated++;
        }
        const margin = marginFromBasePrice(
          p.purchasePricePerKg,
          p.variants.map((v) => ({ ...v, price: shift(v.price) }))
        );
        if (margin != null) {
          await tx.product.update({ where: { id: p.id }, data: { profitMarginPct: margin } });
        }
      }
    },
    { maxWait: 20000, timeout: 30000 }
  );

  return NextResponse.json({ productsUpdated: products.length, variantsUpdated });
}
