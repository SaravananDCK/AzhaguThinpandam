import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin";
import { formatINR } from "@/lib/money";

// Compact preview of a product's active variant prices, e.g. "₹90 / ₹175 / ₹325"
function pricesSummary(variants: { price: number; sortOrder: number }[]): string {
  return (
    [...variants]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((v) => formatINR(v.price))
      .join(" / ") || "—"
  );
}

export async function GET() {
  const { response } = await requireAdminApi();
  if (response) return response;

  const products = await prisma.product.findMany({
    include: {
      category: { select: { name: true } },
      variants: {
        where: { isActive: true },
        select: { price: true, sortOrder: true },
      },
    },
    orderBy: [{ category: { sortOrder: "asc" } }, { name: "asc" }],
  });

  return NextResponse.json(
    products.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category.name,
      active: p.isActive,
      purchasePerKg: p.purchasePricePerKg != null ? p.purchasePricePerKg / 100 : null,
      marginPct: p.profitMarginPct,
      prices: pricesSummary(p.variants),
    }))
  );
}
