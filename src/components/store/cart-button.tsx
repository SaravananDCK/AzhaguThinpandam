"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCart, cartCount } from "@/lib/cart-store";
import { useMounted } from "@/hooks/use-mounted";

/**
 * The nav's primary call-to-action, styled as a dark rounded pill (like the
 * "Say hi" button in the reference). Shows a live item count.
 */
export function CartButton() {
  const items = useCart((s) => s.items);
  // Avoid hydration mismatch: localStorage cart only exists on the client
  const mounted = useMounted();
  const count = mounted ? cartCount(items) : 0;

  return (
    <Link
      href="/cart"
      aria-label={`Cart${count > 0 ? `, ${count} item${count === 1 ? "" : "s"}` : ""}`}
      className="flex items-center gap-2 rounded-full bg-primary-600 px-5 py-3 text-base font-semibold text-white shadow-sm transition-all duration-300 hover:bg-primary-700 hover:shadow-md active:scale-95 group-data-[scrolled=true]/header:px-4 group-data-[scrolled=true]/header:py-2 group-data-[scrolled=true]/header:text-sm"
    >
      <ShoppingBag className="size-5 shrink-0 transition-all duration-300 group-data-[scrolled=true]/header:size-4.5" />
      <span className="hidden sm:inline">Cart</span>
      {count > 0 && (
        <span className="flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-white/25 px-1 text-[11px] font-bold leading-none">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
