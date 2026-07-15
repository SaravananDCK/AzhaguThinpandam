import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { ProductForm } from "../product-form";

export const metadata: Metadata = { title: "New Product" };

export default async function NewProductPage() {
  const categories = await prisma.category.findMany({ orderBy: { sortOrder: "asc" } });

  return (
    <div className="space-y-5">
      <h1 className="font-heading text-2xl font-bold">New Product</h1>
      <ProductForm categories={categories} />
    </div>
  );
}
