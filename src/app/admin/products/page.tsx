import Link from "next/link";
import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { ProductsGrid } from "@/components/admin/products-grid";

export const metadata: Metadata = { title: "Products" };

export default async function AdminProductsPage() {
  const products = await prisma.product.findMany({
    include: {
      category: true,
      images: { orderBy: { sortOrder: "asc" }, take: 1 },
      variants: { orderBy: { sortOrder: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  const rows = products.map((p) => {
    const activeVariants = p.variants.filter((v) => v.isActive);
    const prices = activeVariants.map((v) => v.price);
    return {
      id: p.id,
      image: p.images[0]?.url ?? null,
      name: p.name,
      tamilName: p.tamilName,
      category: p.category.name,
      priceMinRupees: prices.length ? Math.min(...prices) / 100 : null,
      priceMaxRupees: prices.length ? Math.max(...prices) / 100 : null,
      stock: activeVariants.reduce((s, v) => s + v.stock, 0),
      isActive: p.isActive,
      isFeatured: p.isFeatured,
      isFlagship: p.isFlagship,
    };
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Products</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Click a row to edit. Filter by category or visibility with the header filters.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/products/new">
            <Plus className="size-4" /> New product
          </Link>
        </Button>
      </div>
      <ProductsGrid rows={rows} />
    </div>
  );
}
