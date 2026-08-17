import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ChevronRight } from "lucide-react";
import { ProductGallery } from "@/components/store/product-gallery";
import { AddToCart } from "@/components/store/add-to-cart";
import { ProductCard } from "@/components/store/product-card";
import { ProductReviews } from "@/components/store/product-reviews";
import { Stars } from "@/components/store/stars";
import { getProductBySlug, getRelatedProducts } from "@/lib/queries";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getApprovedReviews, hasPurchasedProduct } from "@/lib/reviews";
import { JsonLd, absoluteUrl, siteUrl } from "@/lib/seo";
import { paiseToRupees } from "@/lib/money";
import { isSellable } from "@/lib/availability";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product || !product.isActive) return {};
  const title = product.tamilName ? `${product.name} (${product.tamilName})` : product.name;
  const description = `Buy ${product.name} online from Kovilpatti — ${product.description}`.slice(0, 160);
  const image = product.images[0]?.url;
  return {
    title: `${title} — Buy Online`,
    description,
    keywords: [
      product.name.toLowerCase(),
      product.name.replace(/\s+/g, "").toLowerCase(), // "kadalai mittai" → "kadalaimittai"
      `kovilpatti ${product.name.toLowerCase()}`,
      ...(product.tamilName ? [product.tamilName] : []),
    ],
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: {
      type: "website",
      title,
      description,
      url: `/product/${product.slug}`,
      images: image ? [{ url: image, width: 1000, height: 1000, alt: product.name }] : undefined,
    },
    twitter: { card: "summary_large_image" },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product || !product.isActive) notFound();

  const related = await getRelatedProducts(product.categoryId, product.id);

  const prices = product.variants.map((v) => v.price);
  const inStock = product.variants.some((v) => isSellable(v.stock, product.madeToOrder));

  // Reviews: approved list for everyone, plus this customer's eligibility to post
  const reviews = await getApprovedReviews(product.id);
  const session = await auth();
  let loggedIn = false;
  let purchased = false;
  let existingReview = null;
  if (session?.user?.id) {
    loggedIn = true;
    purchased = await hasPurchasedProduct(
      { id: session.user.id, phone: session.user.phone },
      product.id
    );
    if (purchased) {
      existingReview = await prisma.review.findUnique({
        where: { productId_userId: { productId: product.id, userId: session.user.id } },
        select: { rating: true, title: true, body: true, status: true },
      });
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Rich-result structured data */}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.name,
          alternateName: product.tamilName ?? undefined,
          description: product.description,
          image: product.images.map((i) => absoluteUrl(i.url)),
          brand: { "@type": "Brand", name: "Azhagu Thinpandam" },
          category: product.category.name,
          ...(product.ratingCount > 0
            ? {
                aggregateRating: {
                  "@type": "AggregateRating",
                  ratingValue: product.ratingAvg,
                  reviewCount: product.ratingCount,
                },
              }
            : {}),
          offers: {
            "@type": "AggregateOffer",
            priceCurrency: "INR",
            lowPrice: paiseToRupees(Math.min(...prices)),
            highPrice: paiseToRupees(Math.max(...prices)),
            offerCount: product.variants.length,
            availability: inStock
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
            url: absoluteUrl(`/product/${product.slug}`),
          },
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: siteUrl() },
            {
              "@type": "ListItem",
              position: 2,
              name: product.category.name,
              item: absoluteUrl(`/products?category=${product.category.slug}`),
            },
            { "@type": "ListItem", position: 3, name: product.name },
          ],
        }}
      />
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          Home
        </Link>
        <ChevronRight className="size-3.5" />
        <Link
          href={`/products?category=${product.category.slug}`}
          className="hover:text-foreground"
        >
          {product.category.name}
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="grid gap-8 md:grid-cols-2">
        <ProductGallery images={product.images} alt={product.name} />

        <div>
          <h1 className="font-heading text-2xl font-bold sm:text-3xl">{product.name}</h1>
          {product.tamilName && (
            <p className="mt-1 text-lg text-muted-foreground">{product.tamilName}</p>
          )}
          {product.ratingCount > 0 && (
            <a href="#reviews" className="mt-2 inline-flex items-center gap-1.5 text-sm">
              <Stars value={product.ratingAvg ?? 0} size={16} />
              <span className="text-muted-foreground">
                {product.ratingAvg?.toFixed(1)} ({product.ratingCount})
              </span>
            </a>
          )}

          <div className="mt-6">
            <AddToCart
              productSlug={product.slug}
              productName={product.name}
              tamilName={product.tamilName}
              image={product.images[0]?.url}
              line={product.line}
              madeToOrder={product.madeToOrder}
              variants={product.variants.map((v) => ({
                id: v.id,
                label: v.label,
                price: v.price,
                mrp: v.mrp,
                stock: v.stock,
                weightGrams: v.weightGrams,
              }))}
            />
          </div>

          <div className="mt-8 border-t pt-6">
            <h2 className="font-semibold">About this product</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {product.description}
            </p>
          </div>
        </div>
      </div>

      <ProductReviews
        productId={product.id}
        productSlug={product.slug}
        ratingAvg={product.ratingAvg}
        ratingCount={product.ratingCount}
        reviews={reviews}
        loggedIn={loggedIn}
        purchased={purchased}
        existing={existingReview}
      />

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="font-heading text-xl font-bold">You may also like</h2>
          <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
