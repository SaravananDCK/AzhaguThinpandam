"use client";

import { useState } from "react";
import { Minus, Package, Plus, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/money";
import { basePacketGrams, packNote } from "@/lib/pack";
import { useCart } from "@/lib/cart-store";
import { isSellable, sellableQty } from "@/lib/availability";
import { cn } from "@/lib/utils";

type Variant = {
  id: string;
  label: string;
  price: number;
  mrp: number | null;
  stock: number;
  /** Real pack weight — merchandise labels don't parse to one */
  weightGrams?: number | null;
};

type Props = {
  productSlug: string;
  productName: string;
  tamilName?: string | null;
  image?: string | null;
  variants: Variant[];
  /** PRODUCT_LINES — carried into the cart so only snacks earn the weight discount */
  line?: string;
  /** Made fresh per order — stock never marks it unavailable */
  madeToOrder?: boolean;
};

export function AddToCart({
  productSlug,
  productName,
  tamilName,
  image,
  variants,
  line,
  madeToOrder = false,
}: Props) {
  const firstAvailable =
    variants.find((v) => isSellable(v.stock, madeToOrder)) ?? variants[0];
  const [selected, setSelected] = useState<Variant | undefined>(firstAvailable);
  const [qty, setQty] = useState(1);
  const addItem = useCart((s) => s.addItem);
  const packetGrams = basePacketGrams(variants.map((v) => v.label));

  if (!variants.length) {
    return <p className="text-sm text-muted-foreground">Currently unavailable.</p>;
  }

  const outOfStock = !selected || !isSellable(selected.stock, madeToOrder);
  // How high the quantity stepper may go: the per-line cap for made-to-order
  // items, otherwise what's actually on the shelf.
  const maxQty = selected ? sellableQty(selected.stock, madeToOrder) : 1;

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-sm font-medium">Size</p>
        <div className="flex flex-wrap gap-2">
          {variants.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => {
                setSelected(v);
                setQty(1);
              }}
              disabled={!isSellable(v.stock, madeToOrder)}
              className={cn(
                "rounded-xl border px-4 py-2 text-sm font-medium transition-all duration-300",
                selected?.id === v.id
                  ? "border-primary-600 bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-[0_0_16px_rgba(207,68,68,0.35)]"
                  : "hover:scale-105 hover:border-primary-500",
                !isSellable(v.stock, madeToOrder) &&
                  "cursor-not-allowed opacity-50 line-through"
              )}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {selected && (
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">
            {formatINR(selected.price)}
          </span>
          {selected.mrp && selected.mrp > selected.price && (
            <>
              <span className="text-muted-foreground line-through">
                {formatINR(selected.mrp)}
              </span>
              <Badge variant="secondary">
                {Math.round(((selected.mrp - selected.price) / selected.mrp) * 100)}% off
              </Badge>
            </>
          )}
        </div>
      )}

      {selected && packNote(selected.label, packetGrams) && (
        <p className="inline-flex items-center gap-1.5 rounded-md bg-gold-100 px-3 py-1.5 text-sm font-medium text-gold-800 dark:bg-gold-950/60 dark:text-gold-300">
          <Package className="size-4 shrink-0" /> Delivered as{" "}
          {packNote(selected.label, packetGrams)} for freshness
        </p>
      )}

      {/* Scarcity copy only makes sense for finite goods — never for something
          cooked to order. */}
      {selected && !madeToOrder && selected.stock > 0 && selected.stock <= 5 && (
        <p className="text-sm font-medium text-destructive">
          Only {selected.stock} left in stock
        </p>
      )}

      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-lg border">
          <Button
            variant="ghost"
            size="icon"
            className="size-10"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            disabled={outOfStock || qty <= 1}
            aria-label="Decrease quantity"
          >
            <Minus className="size-4" />
          </Button>
          <span className="w-10 text-center font-medium">{qty}</span>
          <Button
            variant="ghost"
            size="icon"
            className="size-10"
            onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
            disabled={outOfStock || qty >= maxQty}
            aria-label="Increase quantity"
          >
            <Plus className="size-4" />
          </Button>
        </div>

        <Button
          size="lg"
          className="flex-1 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 font-bold transition-all duration-300 hover:scale-[1.02] hover:from-primary-700 hover:to-primary-800 hover:shadow-[0_0_24px_rgba(207,68,68,0.4)] active:scale-95"
          disabled={outOfStock}
          onClick={() => {
            if (!selected) return;
            addItem(
              {
                variantId: selected.id,
                productSlug,
                productName,
                tamilName,
                variantLabel: selected.label,
                price: selected.price,
                image,
                maxStock: maxQty,
                packetGrams,
                weightGrams: selected.weightGrams ?? null,
                line,
              },
              qty
            );
            toast.success(`${productName} (${selected.label}) added to cart`);
          }}
        >
          <ShoppingBag className="size-4" />
          {outOfStock ? "Out of stock" : "Add to cart"}
        </Button>
      </div>
    </div>
  );
}
