import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { CategoryManager } from "./category-manager";

export const metadata: Metadata = { title: "Categories" };

export default async function AdminCategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { products: true } } },
  });

  return (
    <CategoryManager
      categories={categories.map((c) => ({
        id: c.id,
        name: c.name,
        tamilName: c.tamilName,
        slug: c.slug,
        image: c.image,
        productCount: c._count.products,
      }))}
    />
  );
}
