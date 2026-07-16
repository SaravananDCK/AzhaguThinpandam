import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/queries";
import { SETTINGS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { ProductForm } from "../product-form";

export const metadata: Metadata = { title: "New Product" };

export default async function NewProductPage() {
  const [categories, settings] = await Promise.all([
    prisma.category.findMany({ orderBy: { sortOrder: "asc" } }),
    getSettings(),
  ]);
  const roundToFive = settings[SETTINGS.ROUND_TO_FIVE] !== "0";

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
      <ProductForm categories={categories} roundToFive={roundToFive} />
    </div>
  );
}
