import Link from "next/link";
import type { Metadata } from "next";
import { ChevronLeft, ChevronRight, PackageSearch } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/store/product-card";
import { getCategories, getProductsPage } from "@/lib/queries";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

type Props = {
  searchParams: Promise<{ q?: string; category?: string; page?: string }>;
};

function pageHref(opts: { q?: string; category?: string; page: number }) {
  const params = new URLSearchParams();
  if (opts.category) params.set("category", opts.category);
  if (opts.q) params.set("q", opts.q);
  if (opts.page > 1) params.set("page", String(opts.page));
  const qs = params.toString();
  return qs ? `/products?${qs}` : "/products";
}

/** Compact page-number window: 1 … p−1 p p+1 … last */
function pageWindow(page: number, pageCount: number): (number | "…")[] {
  const pages = new Set<number>([1, pageCount, page - 1, page, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= pageCount).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  for (const [i, p] of sorted.entries()) {
    if (i > 0 && p - sorted[i - 1] > 1) out.push("…");
    out.push(p);
  }
  return out;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q, category, page } = await searchParams;
  // Internal search results shouldn't be indexed
  if (q) return { title: "Search", robots: { index: false } };
  const pageNum = Math.max(1, parseInt(page ?? "1", 10) || 1);
  const pageSuffix = pageNum > 1 ? ` — Page ${pageNum}` : "";
  const canonicalPage = pageNum > 1 ? `&page=${pageNum}` : "";
  if (category) {
    const cat = await prisma.category.findUnique({ where: { slug: category } });
    if (cat) {
      return {
        title: `${cat.name}${cat.tamilName ? ` (${cat.tamilName})` : ""} — Buy Online from Kovilpatti${pageSuffix}`,
        description: `Order authentic ${cat.name.toLowerCase()} from Kovilpatti — made fresh in small batches and shipped across India.`,
        alternates: { canonical: `/products?category=${cat.slug}${canonicalPage}` },
      };
    }
  }
  return {
    title: `All Products — Kovilpatti Snacks & Sweets Online${pageSuffix}`,
    description:
      "Kadalai mittai, murukku, sev, seeval, mixture and more — the full AzhaguThinpandam range, made fresh in Kovilpatti.",
    alternates: {
      canonical: pageNum > 1 ? `/products?page=${pageNum}` : "/products",
    },
  };
}

export default async function ProductsPage({ searchParams }: Props) {
  const { q, category, page: pageParam } = await searchParams;
  const requestedPage = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const [categories, { products, total, page, pageCount, perPage }] = await Promise.all([
    getCategories(),
    getProductsPage({ q, categorySlug: category, page: requestedPage }),
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
        <>
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>

          {/* Pagination */}
          {pageCount > 1 && (
            <nav
              className="mt-10 flex items-center justify-center gap-1.5"
              aria-label="Product pages"
            >
              <Button
                asChild={page > 1}
                variant="outline"
                size="icon"
                className="rounded-full"
                disabled={page <= 1}
                aria-label="Previous page"
              >
                {page > 1 ? (
                  <Link href={pageHref({ q, category, page: page - 1 })}>
                    <ChevronLeft className="size-4" />
                  </Link>
                ) : (
                  <ChevronLeft className="size-4" />
                )}
              </Button>
              {pageWindow(page, pageCount).map((p, i) =>
                p === "…" ? (
                  <span key={`gap-${i}`} className="px-1 text-muted-foreground">
                    …
                  </span>
                ) : (
                  <Button
                    key={p}
                    asChild={p !== page}
                    variant={p === page ? "default" : "outline"}
                    size="icon"
                    className="rounded-full"
                  >
                    {p === page ? (
                      <span>{p}</span>
                    ) : (
                      <Link href={pageHref({ q, category, page: p })}>{p}</Link>
                    )}
                  </Button>
                )
              )}
              <Button
                asChild={page < pageCount}
                variant="outline"
                size="icon"
                className="rounded-full"
                disabled={page >= pageCount}
                aria-label="Next page"
              >
                {page < pageCount ? (
                  <Link href={pageHref({ q, category, page: page + 1 })}>
                    <ChevronRight className="size-4" />
                  </Link>
                ) : (
                  <ChevronRight className="size-4" />
                )}
              </Button>
            </nav>
          )}
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of {total}{" "}
            products
          </p>
        </>
      )}
    </div>
  );
}
