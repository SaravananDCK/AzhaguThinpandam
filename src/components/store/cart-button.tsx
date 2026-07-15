"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCart, cartCount } from "@/lib/cart-store";
import { useMounted } from "@/hooks/use-mounted";
import { Button } from "@/components/ui/button";

export function CartButton() {
  const items = useCart((s) => s.items);
  // Avoid hydration mismatch: localStorage cart only exists on the client
  const mounted = useMounted();
  const count = mounted ? cartCount(items) : 0;

  return (
    <Button
      asChild
      variant="ghost"
      size="icon"
      aria-label="Cart"
      className="group relative rounded-xl transition-transform hover:scale-110 active:scale-95"
    >
      <Link href="/cart">
        <ShoppingBag className="size-5 transition-colors group-hover:text-primary-600 dark:group-hover:text-primary-400" />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex size-4.5 items-center justify-center rounded-full bg-primary-600 text-[10px] font-semibold text-white shadow-lg">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </Link>
    </Button>
  );
}
