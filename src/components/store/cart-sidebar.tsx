"use client";

import Link from "next/link";
import { Gift, Minus, Plus, ShoppingBag, X } from "lucide-react";
import { useCart, cartSubtotal, cartCount } from "@/lib/cart-store";
import { useMounted } from "@/hooks/use-mounted";
import { formatINR } from "@/lib/money";
import { activeTier, boxDiscount, formatKg, nextTier, totalKg, type BoxTier } from "@/lib/box";
import { Button } from "@/components/ui/button";

/** Live cart panel shown alongside the products grid (desktop only). */
export function CartSidebar({ tiers }: { tiers: BoxTier[] }) {
  const items = useCart((s) => s.items);
  const removeItem = useCart((s) => s.removeItem);
  const setQty = useCart((s) => s.setQty);
  const mounted = useMounted();

  const subtotal = mounted ? cartSubtotal(items) : 0;
  const count = mounted ? cartCount(items) : 0;
  const weightKg = mounted ? totalKg(items.map((i) => ({ label: i.variantLabel, qty: i.qty }))) : 0;
  const tier = activeTier(tiers, weightKg);
  const next = nextTier(tiers, weightKg);
  const discount = boxDiscount(tiers, weightKg, subtotal);

  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 font-semibold">
          <ShoppingBag className="size-4" /> Your Cart
        </p>
        {count > 0 && (
          <span className="text-xs text-muted-foreground">
            {count} item{count !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {!mounted ? (
        <div className="mt-4 h-16" />
      ) : items.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Your cart is empty. Pick a size on any product and hit <strong>Add to cart</strong>.
        </p>
      ) : (
        <>
          <div className="mt-3 max-h-[46vh] space-y-3 overflow-y-auto pr-1">
            {items.map((item) => (
              <div key={item.variantId} className="flex gap-2.5">
                <div className="size-12 shrink-0 overflow-hidden rounded-lg border bg-muted">
                  {item.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image} alt="" className="size-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.productName}</p>
                  <p className="text-xs text-muted-foreground">{item.variantLabel}</p>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <div className="flex items-center rounded-md border">
                      <button
                        type="button"
                        onClick={() => setQty(item.variantId, item.qty - 1)}
                        className="flex size-6 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="size-3" />
                      </button>
                      <span className="w-6 text-center text-xs font-medium">{item.qty}</span>
                      <button
                        type="button"
                        onClick={() => setQty(item.variantId, item.qty + 1)}
                        disabled={item.qty >= item.maxStock}
                        className="flex size-6 items-center justify-center text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
                        aria-label="Increase quantity"
                      >
                        <Plus className="size-3" />
                      </button>
                    </div>
                    <span className="text-xs font-semibold">{formatINR(item.price * item.qty)}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(item.variantId)}
                  className="self-start text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={`Remove ${item.productName}`}
                >
                  <X className="size-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-3 space-y-1.5 border-t pt-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal ({formatKg(weightKg)})</span>
              <span className="font-medium">{formatINR(subtotal)}</span>
            </div>
            {discount > 0 && tier && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bundle discount ({tier.percent}%)</span>
                <span className="font-semibold text-green-600 dark:text-green-400">
                  −{formatINR(discount)}
                </span>
              </div>
            )}
            <div className="flex justify-between font-semibold">
              <span>{discount > 0 ? "After discount" : "Total"}</span>
              <span>{formatINR(subtotal - discount)}</span>
            </div>
          </div>

          {next && (
            <p className="mt-2 flex items-center gap-1.5 rounded-md bg-primary-50 px-2.5 py-2 text-xs font-medium text-primary-800 dark:bg-primary-950/60 dark:text-primary-300">
              <Gift className="size-3.5 shrink-0" />
              Add {formatKg(next.count - weightKg)} more to{" "}
              {tier ? `bump your discount to ${next.percent}%` : `unlock ${next.percent}% off`}
            </p>
          )}

          <p className="mt-2 text-xs text-muted-foreground">Shipping calculated at checkout.</p>

          <div className="mt-3 space-y-2">
            <Button asChild className="w-full">
              <Link href="/checkout">Checkout</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link href="/cart">View full cart</Link>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
