import Link from "next/link";
import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatINR } from "@/lib/money";

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

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold">Products</h1>
        <Button asChild>
          <Link href="/admin/products/new">
            <Plus className="size-4" /> New product
          </Link>
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14"></TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p) => {
              const activeVariants = p.variants.filter((v) => v.isActive);
              const prices = activeVariants.map((v) => v.price);
              const totalStock = activeVariants.reduce((s, v) => s + v.stock, 0);
              return (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="size-10 overflow-hidden rounded-lg border bg-muted">
                      {p.images[0] && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.images[0].url}
                          alt=""
                          className="size-full object-cover"
                        />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/admin/products/${p.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {p.name}
                    </Link>
                    {p.tamilName && (
                      <p className="text-xs text-muted-foreground">{p.tamilName}</p>
                    )}
                  </TableCell>
                  <TableCell>{p.category.name}</TableCell>
                  <TableCell>
                    {prices.length
                      ? prices.length > 1
                        ? `${formatINR(Math.min(...prices))} – ${formatINR(Math.max(...prices))}`
                        : formatINR(prices[0])
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={totalStock === 0 ? "destructive" : "outline"}>
                      {totalStock}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {!p.isActive && <Badge variant="secondary">Hidden</Badge>}
                      {p.isFlagship && <Badge className="bg-gold-500 text-white">Flagship</Badge>}
                      {p.isFeatured && <Badge>Featured</Badge>}
                      {p.isActive && !p.isFeatured && <Badge variant="outline">Live</Badge>}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
