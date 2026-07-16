"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Gift, Minus, Plus, Search, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatINR } from "@/lib/money";
import { useCart } from "@/lib/cart-store";
import { activeTier, boxDiscount, nextTier, type BoxTier } from "@/lib/box";
import { cn } from "@/lib/utils";

export type BoxItem = {
  variantId: string;
  productSlug: string;
  productName: string;
  tamilName: string | null;
  category: string;
  label: string;
  price: number;
  stock: number;
  image: string | null;
};

export function BoxBuilder({ items, tiers }: { items: BoxItem[]; tiers: BoxTier[] }) {
  const router = useRouter();
  const addItem = useCart((s) => s.addItem);
  const [qty, setQtyMap] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const categories = useMemo(
    () => [...new Set(items.map((i) => i.category))],
    [items]
  );
  const visibleItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((i) => {
      if (categoryFilter && i.category !== categoryFilter) return false;
      if (!term) return true;
      return (
        i.productName.toLowerCase().includes(term) ||
        (i.tamilName ?? "").toLowerCase().includes(term)
      );
    });
  }, [items, search, categoryFilter]);

  const setQty = (id: string, value: number, max: number) =>
    setQtyMap((m) => ({ ...m, [id]: Math.max(0, Math.min(max, value)) }));

  const { count, subtotal } = useMemo(() => {
    let count = 0;
    let subtotal = 0;
    for (const item of items) {
      const q = qty[item.variantId] ?? 0;
      count += q;
      subtotal += q * item.price;
    }
    return { count, subtotal };
  }, [items, qty]);

  const tier = activeTier(tiers, count);
  const next = nextTier(tiers, count);
  const discount = boxDiscount(tiers, count, subtotal);
  const maxTierCount = tiers.length ? tiers[tiers.length - 1].count : 0;

  function addBoxToCart() {
    let added = 0;
    for (const item of items) {
      const q = qty[item.variantId] ?? 0;
      if (q <= 0) continue;
      addItem(
        {
          variantId: item.variantId,
          productSlug: item.productSlug,
          productName: item.productName,
          tamilName: item.tamilName,
          variantLabel: item.label,
          price: item.price,
          image: item.image,
          maxStock: item.stock,
        },
        q
      );
      added += q;
    }
    toast.success(
      tier
        ? `Box with ${added} packs added — ${tier.percent}% discount applies at checkout!`
        : `${added} packs added to your cart.`
    );
    router.push("/cart");
  }

  return (
    <div className="mt-6 space-y-5 pb-28">
      {/* Tier progress */}
      <Card className="border-gold-300/60 dark:border-gold-800">
        <CardContent className="space-y-3">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Gift className="size-4 text-gold-600 dark:text-gold-400" />
            {tier
              ? `${tier.percent}% off unlocked!`
              : next
                ? `Add ${next.count - count} more pack${next.count - count > 1 ? "s" : ""} to unlock ${next.percent}% off`
                : "Pick your packs"}
            {tier && next && (
              <span className="font-normal text-muted-foreground">
                — {next.count - count} more for {next.percent}%
              </span>
            )}
          </p>
          <div className="relative h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-gold-400 to-gold-600 transition-[width] duration-500"
              style={{
                width: `${maxTierCount ? Math.min(100, (count / maxTierCount) * 100) : 0}%`,
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            {tiers.map((t) => (
              <span
                key={t.count}
                className={cn(
                  "font-medium",
                  count >= t.count && "text-gold-700 dark:text-gold-400"
                )}
              >
                {t.count} packs · {t.percent}% off
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Search + category filter */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search products…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            aria-label="Search products in the box builder"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setCategoryFilter(null)}>
            <Badge
              variant={!categoryFilter ? "default" : "outline"}
              className="rounded-full px-3 py-1"
            >
              All
            </Badge>
          </button>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategoryFilter((cur) => (cur === c ? null : c))}
            >
              <Badge
                variant={categoryFilter === c ? "default" : "outline"}
                className="rounded-full px-3 py-1"
              >
                {c}
              </Badge>
            </button>
          ))}
        </div>
      </div>

      {/* Product rows */}
      <div className="divide-y rounded-2xl border">
        {visibleItems.length === 0 && (
          <p className="p-6 text-center text-sm text-muted-foreground">
            No products match — clear the search or pick another category.
            {count > 0 && " Your selections are kept."}
          </p>
        )}
        {visibleItems.map((item) => {
          const q = qty[item.variantId] ?? 0;
          return (
            <div key={item.variantId} className="flex items-center gap-3 p-3">
              <div className="size-14 shrink-0 overflow-hidden rounded-lg border bg-muted">
                {item.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image} alt="" className="size-full object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className={cn("text-sm font-medium leading-tight", q > 0 && "text-primary")}>
                  {item.productName}
                  {item.tamilName && (
                    <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                      {item.tamilName}
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {item.label} · {formatINR(item.price)}
                  {item.stock <= 0 && (
                    <span className="ml-1.5 text-destructive">out of stock</span>
                  )}
                </p>
              </div>
              <div className="flex items-center rounded-lg border">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => setQty(item.variantId, q - 1, item.stock)}
                  disabled={q <= 0}
                  aria-label={`Remove one ${item.productName}`}
                >
                  <Minus className="size-3.5" />
                </Button>
                <span className={cn("w-8 text-center text-sm font-semibold", q > 0 && "text-primary")}>
                  {q}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => setQty(item.variantId, q + 1, item.stock)}
                  disabled={q >= item.stock}
                  aria-label={`Add one ${item.productName}`}
                >
                  <Plus className="size-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sticky summary bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 backdrop-blur-lg">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3">
          <div className="text-sm">
            <p className="font-semibold">
              {count} pack{count !== 1 ? "s" : ""} ·{" "}
              {discount > 0 ? (
                <>
                  <span className="text-muted-foreground line-through">
                    {formatINR(subtotal)}
                  </span>{" "}
                  <span className="text-primary">{formatINR(subtotal - discount)}</span>
                </>
              ) : (
                formatINR(subtotal)
              )}
            </p>
            {discount > 0 && tier && (
              <p className="text-xs font-medium text-green-600 dark:text-green-400">
                You save {formatINR(discount)} ({tier.percent}% off)
              </p>
            )}
          </div>
          <Button size="lg" disabled={count === 0} onClick={addBoxToCart}>
            <ShoppingBag className="size-4" /> Add box to cart
          </Button>
        </div>
      </div>
    </div>
  );
}
