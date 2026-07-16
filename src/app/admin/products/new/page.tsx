import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { ProductForm } from "../product-form";

export const metadata: Metadata = { title: "New Product" };

export default async function NewProductPage() {
  const categories = await prisma.category.findMany({ orderBy: { sortOrder: "asc" } });

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/admin/products" aria-label="Back to products">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <h1 className="font-heading text-2xl font-bold">New Product</h1>
      </div>
      <ProductForm categories={categories} />
    </div>
  );
}
