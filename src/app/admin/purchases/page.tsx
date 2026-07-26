import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { labelToGrams } from "@/lib/pack";
import { PurchasesGrid } from "@/components/admin/purchases-grid";

export const metadata: Metadata = { title: "Purchases" };

export default async function AdminPurchasesPage() {
  const [variants, suppliers] = await Promise.all([
    prisma.productVariant.findMany({
      where: { isActive: true, product: { isActive: true } },
      include: { product: { select: { name: true, purchasePricePerKg: true } } },
      orderBy: [{ product: { name: "asc" } }, { sortOrder: "asc" }],
    }),
    prisma.supplier.findMany({
      where: { isActive: true },
      select: { id: true, name: true, gstRate: true },
      orderBy: { name: "asc" },
    }),
  ]);
  const variantOptions = variants.map((v) => ({
    id: v.id,
    name: `${v.product.name} (${v.label})`,
    grams: labelToGrams(v.label), // pack weight, for the kg default
    pricePerKgPaise: v.product.purchasePricePerKg, // wholesale ₹/kg default
  }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-2xl font-bold">Purchases</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Wholesale stock bought from your supplier — counted as cost of goods in
          the P&amp;L. Pick a supplier and GST rate so it feeds payables and the
          input-GST report. Expand a row to see its items.
        </p>
      </div>
      <PurchasesGrid variantOptions={variantOptions} supplierOptions={suppliers} />
    </div>
  );
}
