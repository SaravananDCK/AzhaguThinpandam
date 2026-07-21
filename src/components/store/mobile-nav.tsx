"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, PackageSearch } from "lucide-react";
import type { Category } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SearchBox } from "@/components/store/search-box";

function DrawerLink({
  href,
  onClick,
  children,
  sub,
}: {
  href: string;
  onClick: () => void;
  children: React.ReactNode;
  sub?: string | null;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="group relative flex items-center gap-3 rounded-lg px-3 py-2.5 font-medium transition-colors hover:bg-accent"
    >
      <span className="absolute bottom-1 left-0 top-1 w-1 rounded-r bg-primary-600 opacity-0 transition-opacity group-hover:opacity-100" />
      <span className="text-sm">{children}</span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </Link>
  );
}

export function MobileNav({ categories }: { categories: Category[] }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-xl md:hidden" aria-label="Menu">
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80">
        <SheetHeader className="border-b">
          <SheetTitle className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" className="size-8 rounded-full" />
            Azhagu Thinpandam
          </SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-1 overflow-y-auto px-4 pb-6">
          <div className="mb-3 sm:hidden">
            <SearchBox onSubmitted={close} />
          </div>
          <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Categories
          </p>
          <DrawerLink href="/products" onClick={close}>
            All Products
          </DrawerLink>
          <DrawerLink href="/build-box" onClick={close}>
            <span className="font-semibold text-gold-700 dark:text-gold-400">
              🎁 Build Your Box
            </span>
          </DrawerLink>
          {categories.map((c) => (
            <DrawerLink
              key={c.id}
              href={`/products?category=${c.slug}`}
              onClick={close}
              sub={c.tamilName}
            >
              {c.name}
            </DrawerLink>
          ))}
          <p className="mb-1 mt-4 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Orders
          </p>
          <Link
            href="/track-order"
            onClick={close}
            className="group relative flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
          >
            <span className="absolute bottom-1 left-0 top-1 w-1 rounded-r bg-primary-600 opacity-0 transition-opacity group-hover:opacity-100" />
            <PackageSearch className="size-4 text-muted-foreground" /> Track Order
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}
