import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { ProductForm } from "../product-form";

export const metadata: Metadata = { title: "Edit Product" };

type Props = { params: Promise<{ id: string }> };

export default async function EditProductPage({ params }: Props) {
  const { id } = await params;
  const [product, categories] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        variants: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
      },
    }),
    prisma.category.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  if (!product) notFound();

  return (
    <div className="space-y-5">
      <h1 className="font-heading text-2xl font-bold">Edit Product</h1>
      <ProductForm categories={categories} product={product} />
    </div>
  );
}
