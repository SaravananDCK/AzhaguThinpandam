import Link from "next/link";
import { CheckCircle2, Sparkles, XCircle } from "lucide-react";
import { CardAddToCart } from "@/components/store/card-add-to-cart";
import type { ProductWithDetails } from "@/lib/queries";

export function ProductCard({ product }: { product: ProductWithDetails }) {
  const image = product.images[0]?.url;
  const prices = product.variants.map((v) => v.price);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const cheapest = product.variants.find((v) => v.price === minPrice);
  const inStock = product.variants.some((v) => v.stock > 0);
  const discount =
    cheapest?.mrp && cheapest.mrp > cheapest.price
      ? Math.round(((cheapest.mrp - cheapest.price) / cheapest.mrp) * 100)
      : 0;
  const href = `/product/${product.slug}`;

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border bg-card transition-all duration-500 hover:-translate-y-1 hover:border-primary-500 hover:shadow-xl dark:hover:border-primary-500 ${
        !inStock ? "opacity-70" : ""
      }`}
    >
      {/* Badges */}
      {discount > 0 && (
        <div className="absolute right-3 top-3 z-20 rounded-full border border-gold-300/40 bg-gradient-to-r from-gold-500 to-gold-700 px-3 py-1 text-[11px] font-bold text-white shadow-[0_0_16px_rgba(210,161,55,0.5)]">
          -{discount}%
        </div>
      )}
      {!inStock ? (
        <div className="absolute left-3 top-3 z-20 rounded-full bg-dark-700/90 px-3 py-1 text-[11px] font-bold text-white shadow-lg backdrop-blur-sm">
          Out of stock
        </div>
      ) : (
        product.isFlagship && (
          <div className="absolute left-3 top-3 z-20 flex items-center gap-1 rounded-full border border-gold-300/50 bg-gradient-to-r from-gold-400 to-gold-600 px-3 py-1 text-[11px] font-bold text-white shadow-[0_0_16px_rgba(210,161,55,0.55)]">
            <Sparkles className="size-3" /> Signature
          </div>
        )
      )}

      {/* Image with zoom + gradient overlay */}
      <Link href={href} className="relative block aspect-square overflow-hidden bg-muted">
        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={product.name}
            className="size-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
            loading="lazy"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      </Link>

      {/* Content */}
      <div className="space-y-2 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {product.category.name}
        </p>
        <Link href={href} className="block">
          <h3 className="font-semibold leading-snug transition-colors group-hover:text-primary-600 dark:group-hover:text-primary-400">
            {product.name}
            {product.tamilName && (
              <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                {product.tamilName}
              </span>
            )}
          </h3>
        </Link>

        {inStock ? (
          <p className="flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-400">
            <CheckCircle2 className="size-3.5" /> In stock — made fresh to order
          </p>
        ) : (
          <p className="flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400">
            <XCircle className="size-3.5" /> Currently unavailable
          </p>
        )}

        {/* Price + size picker + add to cart */}
        <CardAddToCart
          productSlug={product.slug}
          productName={product.name}
          tamilName={product.tamilName}
          image={image}
          variants={product.variants.map((v) => ({
            id: v.id,
            label: v.label,
            price: v.price,
            mrp: v.mrp,
            stock: v.stock,
          }))}
        />
      </div>
    </div>
  );
}
