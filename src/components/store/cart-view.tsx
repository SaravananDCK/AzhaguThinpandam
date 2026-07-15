"use client";

import Link from "next/link";
import { Gift, Minus, Package, Plus, ShoppingBag, Trash2, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useCart, cartSubtotal } from "@/lib/cart-store";
import { useMounted } from "@/hooks/use-mounted";
import { formatINR } from "@/lib/money";
import { packNote } from "@/lib/pack";
import { activeTier, boxDiscount, nextTier, type BoxTier } from "@/lib/box";

export function CartView({
  shippingFee,
  freeShippingAbove,
  tiers,
}: {
  shippingFee: number;
  freeShippingAbove: number;
  tiers: BoxTier[];
}) {
  const { items, setQty, removeItem } = useCart();
  const mounted = useMounted();

  if (!mounted) return <div className="mx-auto max-w-4xl px-4 py-12" />;

  if (items.length === 0) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 px-4 py-20 text-center">
        <ShoppingBag className="size-14 text-muted-foreground" />
        <h1 className="font-heading text-2xl font-bold">Your cart is empty</h1>
        <p className="text-sm text-muted-foreground">
          Fill it with kadalai mittai, murukku and more.
        </p>
        <Button asChild className="mt-2">
          <Link href="/products">Browse products</Link>
        </Button>
      </div>
    );
  }

  const subtotal = cartSubtotal(items);
  const packCount = items.reduce((sum, i) => sum + i.qty, 0);
  const tier = activeTier(tiers, packCount);
  const next = nextTier(tiers, packCount);
  const discount = boxDiscount(tiers, packCount, subtotal);
  // Shipping threshold applies to the discounted amount (matches the server)
  const discounted = subtotal - discount;
  const freeShipping = discounted >= freeShippingAbove;
  const shipping = freeShipping ? 0 : shippingFee;
  const remaining = freeShippingAbove - discounted;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="font-heading text-2xl font-bold sm:text-3xl">Your Cart</h1>
      <div className="mt-6 grid gap-6 md:grid-cols-[1fr_300px]">
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.variantId} className="py-3">
              <CardContent className="flex items-center gap-3 px-3">
                <Link
                  href={`/product/${item.productSlug}`}
                  className="size-20 shrink-0 overflow-hidden rounded-lg border bg-muted"
                >
                  {item.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image} alt="" className="size-full object-cover" />
                  )}
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/product/${item.productSlug}`}
                    className="font-medium hover:text-primary"
                  >
                    {item.productName}
                  </Link>
                  <p className="text-sm text-muted-foreground">{item.variantLabel}</p>
                  {packNote(item.variantLabel) && (
                    <p className="mt-1 inline-flex items-center gap-1 rounded-md bg-gold-100 px-2 py-0.5 text-xs font-medium text-gold-800 dark:bg-gold-950/60 dark:text-gold-300">
                      <Package className="size-3" />
                      Delivered as {packNote(item.variantLabel)} for freshness
                    </p>
                  )}
                  <p className="mt-1 text-sm font-semibold">{formatINR(item.price)}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center rounded-lg border">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => setQty(item.variantId, item.qty - 1)}
                      aria-label="Decrease quantity"
                    >
                      <Minus className="size-3.5" />
                    </Button>
                    <span className="w-8 text-center text-sm font-medium">{item.qty}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => setQty(item.variantId, item.qty + 1)}
                      disabled={item.qty >= item.maxStock}
                      aria-label="Increase quantity"
                    >
                      <Plus className="size-3.5" />
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-muted-foreground hover:text-destructive"
                    onClick={() => removeItem(item.variantId)}
                  >
                    <Trash2 className="size-3.5" /> Remove
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="h-fit">
          <CardContent className="space-y-3">
            <p className="font-semibold">Order Summary</p>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Subtotal ({packCount} pack{packCount !== 1 ? "s" : ""})
              </span>
              <span className="font-medium">{formatINR(subtotal)}</span>
            </div>
            {discount > 0 && tier && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Bundle discount ({tier.percent}%)</span>
                <span className="font-semibold text-green-600 dark:text-green-400">
                  −{formatINR(discount)}
                </span>
              </div>
            )}
            {next && (
              <p className="flex items-center gap-1.5 rounded-md bg-primary-50 px-2.5 py-2 text-xs font-medium text-primary-800 dark:bg-primary-950/60 dark:text-primary-300">
                <Gift className="size-3.5 shrink-0" />
                Add {next.count - packCount} more pack{next.count - packCount > 1 ? "s" : ""} to{" "}
                {tier ? `bump your discount to ${next.percent}%` : `unlock ${next.percent}% off`}
              </p>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Shipping</span>
              {freeShipping ? (
                <span className="font-semibold text-green-600 dark:text-green-400">
                  FREE{" "}
                  <span className="font-normal text-muted-foreground line-through">
                    {formatINR(shippingFee)}
                  </span>
                </span>
              ) : (
                <span className="font-medium">{formatINR(shipping)}</span>
              )}
            </div>

            {/* Free-shipping status */}
            {freeShipping ? (
              <p className="flex items-center gap-1.5 rounded-md bg-green-100 px-2.5 py-2 text-xs font-medium text-green-800 dark:bg-green-950/60 dark:text-green-300">
                <Truck className="size-3.5 shrink-0" />
                You&apos;ve unlocked FREE shipping!
              </p>
            ) : (
              <div className="space-y-1.5 rounded-md bg-gold-100 px-2.5 py-2 dark:bg-gold-950/60">
                <p className="flex items-center gap-1.5 text-xs font-medium text-gold-800 dark:text-gold-300">
                  <Truck className="size-3.5 shrink-0" />
                  Add {formatINR(remaining)} more for FREE shipping (orders above{" "}
                  {formatINR(freeShippingAbove)})
                </p>
                <div className="h-1.5 overflow-hidden rounded-full bg-gold-200 dark:bg-gold-900">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-gold-400 to-gold-600 transition-[width] duration-500"
                    style={{ width: `${Math.min(100, (subtotal / freeShippingAbove) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            <Separator />
            <div className="flex justify-between text-sm font-semibold">
              <span>Total</span>
              <span>{formatINR(discounted + shipping)}</span>
            </div>
            <Button asChild className="w-full" size="lg">
              <Link href="/checkout">Proceed to Checkout</Link>
            </Button>
            <Button asChild variant="ghost" className="w-full" size="sm">
              <Link href="/products">Continue shopping</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
