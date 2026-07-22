"use client";

import { useState } from "react";
import { ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { formatINR } from "@/lib/money";
import { basePacketGrams } from "@/lib/pack";
import { useCart } from "@/lib/cart-store";
import { cn } from "@/lib/utils";

type Variant = {
  id: string;
  label: string;
  price: number;
  mrp: number | null;
  stock: number;
};

type Props = {
  productSlug: string;
  productName: string;
  tamilName?: string | null;
  image?: string | null;
  variants: Variant[];
};

/** Compact price + size picker + add button, used inside product cards so
 *  customers can add to cart without opening the detail page. */
export function CardAddToCart({ productSlug, productName, tamilName, image, variants }: Props) {
  const firstAvailable = variants.find((v) => v.stock > 0) ?? variants[0];
  const [selected, setSelected] = useState<Variant | undefined>(firstAvailable);
  const addItem = useCart((s) => s.addItem);
  const packetGrams = basePacketGrams(variants.map((v) => v.label));

  if (!variants.length) {
    return <p className="text-xs text-muted-foreground">Currently unavailable.</p>;
  }

  const anyStock = variants.some((v) => v.stock > 0);
  const outOfStock = !selected || selected.stock <= 0;
  const discount =
    selected?.mrp && selected.mrp > selected.price
      ? Math.round(((selected.mrp - selected.price) / selected.mrp) * 100)
      : 0;

  function add() {
    if (!selected) return;
    addItem({
      variantId: selected.id,
      productSlug,
      productName,
      tamilName,
      variantLabel: selected.label,
      price: selected.price,
      image,
      maxStock: selected.stock,
      packetGrams,
    });
    toast.success(`${productName} (${selected.label}) added to cart`);
  }

  return (
    <div className="space-y-2">
      {/* Price of the selected size */}
      <div className="flex items-baseline gap-2">
        <span className="text-xl font-bold text-primary-600 dark:text-primary-400">
          {formatINR(selected?.price ?? 0)}
        </span>
        {discount > 0 && selected?.mrp && (
          <span className="text-xs text-muted-foreground line-through">
            {formatINR(selected.mrp)}
          </span>
        )}
      </div>

      {/* Size chips — a single-variant product shows one (selected) chip, so its
          pack size is always visible, consistent with multi-variant products. */}
      <div className="flex flex-wrap gap-1.5">
        {variants.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setSelected(v)}
            disabled={v.stock <= 0 || variants.length === 1}
            className={cn(
              "rounded-lg border px-2 py-0.5 text-xs font-medium transition-colors",
              selected?.id === v.id
                ? "border-primary-600 bg-primary-600 text-white"
                : "hover:border-primary-500",
              v.stock <= 0 && "cursor-not-allowed line-through opacity-40",
              variants.length === 1 && "cursor-default"
            )}
          >
            {v.label}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={add}
        disabled={outOfStock}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 py-2.5 text-sm font-bold text-white transition-all duration-300 hover:shadow-[0_0_20px_rgba(207,68,68,0.35)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-none"
      >
        <ShoppingCart className="size-4" />
        {anyStock ? "Add to cart" : "Out of stock"}
      </button>
    </div>
  );
}
