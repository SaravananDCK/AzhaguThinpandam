"use client";

import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart-store";
import { formatINR } from "@/lib/money";

/**
 * Opens WhatsApp with the cart written out as text. Customers were already
 * sending cart *screenshots* on WhatsApp — often to the wrong number, where
 * they got lost. This channels the same habit to the store's number with the
 * items as copyable text instead of an image someone has to retype.
 */
export function WhatsAppCartButton({ waNumber }: { waNumber: string }) {
  const items = useCart((s) => s.items);
  if (items.length === 0) return null;

  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const lines = [
    "Hi! I'd like to order:",
    ...items.map(
      (i) => `• ${i.productName} (${i.variantLabel}) × ${i.qty} — ${formatINR(i.price * i.qty)}`
    ),
    `Subtotal: ${formatINR(subtotal)}`,
  ];
  const href = `https://wa.me/${waNumber}?text=${encodeURIComponent(lines.join("\n"))}`;

  return (
    <Button asChild variant="outline" className="w-full" size="sm">
      <a href={href} target="_blank" rel="noopener noreferrer">
        <MessageCircle className="size-4" /> Order on WhatsApp instead
      </a>
    </Button>
  );
}
