import Link from "next/link";
import type { Metadata } from "next";
import { PackageSearch } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ProductCard } from "@/components/store/product-card";
import { getCategories, getProducts } from "@/lib/queries";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

type Props = {
  searchParams: Promise<{ q?: string; category?: string }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q, category } = await searchParams;
  // Internal search results shouldn't be indexed
  if (q) return { title: "Search", robots: { index: false } };
  if (category) {
    const cat = await prisma.category.findUnique({ where: { slug: category } });
    if (cat) {
      return {
        title: `${cat.name}${cat.tamilName ? ` (${cat.tamilName})` : ""} — Buy Online from Kovilpatti`,
        description: `Order authentic ${cat.name.toLowerCase()} from Kovilpatti — made fresh in small batches and shipped across India.`,
        alternates: { canonical: `/products?category=${cat.slug}` },
      };
    }
  }
  return {
    title: "All Products — Kovilpatti Snacks & Sweets Online",
    description:
      "Kadalai mittai, murukku, sev, seeval, mixture and more — the full AzhaguThinpandam range, made fresh in Kovilpatti.",
    alternates: { canonical: "/products" },
  };
}

export default async function ProductsPage({ searchParams }: Props) {
  const { q, category } = await searchParams;
  const [categories, products] = await Promise.all([
    getCategories(),
    getProducts({ q, categorySlug: category }),
  ]);
  const activeCategory = categories.find((c) => c.slug === category);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-heading text-2xl font-bold sm:text-3xl">
        {activeCategory ? activeCategory.name : "All Products"}
        {activeCategory?.tamilName && (
          <span className="ml-2 text-base font-normal text-muted-foreground">
            {activeCategory.tamilName}
          </span>
        )}
      </h1>
      {q && (
        <p className="mt-1 text-sm text-muted-foreground">
          Showing results for “{q}”
        </p>
      )}

      {/* Category filter chips */}
      <div className="mt-5 flex flex-wrap gap-2">
        <Link href={q ? `/products?q=${encodeURIComponent(q)}` : "/products"}>
          <Badge
            variant={!category ? "default" : "outline"}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm transition-all duration-300",
              !category
                ? "bg-gradient-to-r from-primary-600 to-primary-700 shadow-[0_0_16px_rgba(207,68,68,0.3)]"
                : "hover:scale-105 hover:border-primary-500 hover:text-primary-600 dark:hover:text-primary-400"
            )}
          >
            All
          </Badge>
        </Link>
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/products?category=${c.slug}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
          >
            <Badge
              variant={category === c.slug ? "default" : "outline"}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm transition-all duration-300",
                category === c.slug
                  ? "bg-gradient-to-r from-primary-600 to-primary-700 shadow-[0_0_16px_rgba(207,68,68,0.3)]"
                  : "hover:scale-105 hover:border-primary-500 hover:text-primary-600 dark:hover:text-primary-400"
              )}
            >
              {c.name}
            </Badge>
          </Link>
        ))}
      </div>

      {products.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-3 text-center">
          <PackageSearch className="size-12 text-muted-foreground" />
          <p className="font-medium">No products found</p>
          <p className="text-sm text-muted-foreground">
            Try a different search or browse all products.
          </p>
          <Link href="/products" className="text-sm font-medium text-primary hover:underline">
            View all products
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
