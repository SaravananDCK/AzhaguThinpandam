import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { PurchasesGrid } from "@/components/admin/purchases-grid";

export const metadata: Metadata = { title: "Purchases" };

export default async function AdminPurchasesPage() {
  const variants = await prisma.productVariant.findMany({
    where: { isActive: true, product: { isActive: true } },
    include: { product: { select: { name: true } } },
    orderBy: [{ product: { name: "asc" } }, { sortOrder: "asc" }],
  });
  const variantOptions = variants.map((v) => ({
    id: v.id,
    name: `${v.product.name} (${v.label})`,
  }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-2xl font-bold">Purchases</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Wholesale stock bought from your supplier — counted as cost of goods in
          the P&amp;L. Expand a row to see its items.
        </p>
      </div>
      <PurchasesGrid variantOptions={variantOptions} />
    </div>
  );
}
