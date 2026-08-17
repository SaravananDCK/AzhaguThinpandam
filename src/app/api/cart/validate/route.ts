import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { staffUnitPrice } from "@/lib/staff-pricing";
import { getViewerPricing } from "@/lib/viewer";

// The cart lives in the browser's localStorage and keeps whatever stock and
// price were true when each item was added — potentially days ago. Without this
// the first time anyone learns an item ran out is the rejection from
// /api/checkout on the final click, which tells them to "update your cart"
// while the cart itself still looks fine. This lets the cart re-check itself on
// load so the problem is visible and fixable before checkout.

const schema = z.object({
  variantIds: z.array(z.string().min(1)).max(50),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const ids = [...new Set(parsed.data.variantIds)];
  if (!ids.length) return NextResponse.json({ items: [] });

  const [variants, { isEmployee }] = await Promise.all([
    prisma.productVariant.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        label: true,
        price: true,
        stock: true,
        isActive: true,
        weightGrams: true,
        unitCost: true,
        product: {
          select: {
            name: true,
            isActive: true,
            purchasePricePerKg: true,
            variants: { where: { isActive: true }, select: { label: true } },
          },
        },
      },
    }),
    getViewerPricing(),
  ]);

  const byId = new Map(variants.map((v) => [v.id, v]));
  const items = ids.map((id) => {
    const v = byId.get(id);
    // Deleted, delisted, or its product was hidden — it can't be ordered.
    if (!v || !v.isActive || !v.product.isActive) {
      return { variantId: id, available: false, stock: 0, price: 0, name: "", label: "" };
    }
    return {
      variantId: id,
      available: true,
      stock: v.stock,
      // Same price the storefront would quote this viewer, staff included, so a
      // cart that predates a price change stops showing the old figure.
      price: isEmployee ? staffUnitPrice(v, v.product) : v.price,
      name: v.product.name,
      label: v.label,
    };
  });

  return NextResponse.json({ items });
}
