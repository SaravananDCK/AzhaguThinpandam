import Link from "next/link";
import { Mail, Phone, User } from "lucide-react";
import { auth } from "@/lib/auth";
import { getCategories, getSettings } from "@/lib/queries";
import { SETTINGS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { CartButton } from "@/components/store/cart-button";
import { MobileNav } from "@/components/store/mobile-nav";
import { ScrollHeader } from "@/components/store/scroll-header";
import { SearchBox } from "@/components/store/search-box";
import { ThemeToggle } from "@/components/store/theme-toggle";

export async function Navbar() {
  const [categories, session, settings] = await Promise.all([
    getCategories(),
    auth(),
    getSettings(),
  ]);
  const phone = settings[SETTINGS.STORE_PHONE];
  const email = settings[SETTINGS.STORE_EMAIL];

  return (
    <ScrollHeader>
      {/* Top info bar — collapses away once scrolled */}
      <div className="max-h-10 overflow-hidden bg-primary-600 text-xs text-white transition-[max-height] duration-300 group-data-[scrolled=true]/header:max-h-0 dark:bg-primary-700">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-1.5">
          <div className="flex items-center gap-4">
            {phone && (
              <a href={`tel:${phone.replace(/\s/g, "")}`} className="flex items-center gap-1.5 hover:underline">
                <Phone className="size-3" /> {phone}
              </a>
            )}
            {email && (
              <a href={`mailto:${email}`} className="hidden items-center gap-1.5 hover:underline md:flex">
                <Mail className="size-3" /> {email}
              </a>
            )}
          </div>
          <Link href="/track-order" className="hover:underline">
            Track Order
          </Link>
        </div>
      </div>

      {/* Main bar */}
      <div className="mx-auto flex h-28 max-w-6xl items-center gap-2 px-4 transition-[height] duration-300 group-data-[scrolled=true]/header:h-16 sm:gap-3">
        <MobileNav categories={categories} />
        <Link href="/" className="group flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="AzhaguThinpandam logo"
            className="size-25 shrink-0 rounded-full shadow-md transition-all duration-300 group-hover:scale-105 group-hover:shadow-lg group-data-[scrolled=true]/header:size-13"
          />
          {/* The emblem carries the name — text shown from sm up */}
          <div className="hidden flex-col leading-tight sm:flex">
            <span className="font-heading text-lg font-bold tracking-tight">
              AzhaguThinpandam
            </span>
            <span className="text-[11px] text-muted-foreground">அழகு தின்பண்டம்</span>
          </div>
        </Link>

        <div className="mx-2 hidden max-w-xl flex-1 sm:block lg:mx-6">
          <SearchBox />
        </div>

        <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
          <ThemeToggle />
          <Button
            asChild
            variant="ghost"
            size="icon"
            aria-label="Account"
            className="rounded-xl transition-transform hover:scale-110 active:scale-95"
          >
            <Link href={session?.user ? "/account" : "/login"}>
              <User className="size-5" />
            </Link>
          </Button>
          <CartButton />
        </div>
      </div>

      {/* Category bar (desktop) */}
      <nav className="hidden border-t border-border/60 md:block">
        <div className="mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto px-4 py-1.5">
          <Button asChild variant="ghost" size="sm" className="rounded-full font-medium">
            <Link href="/products">All Products</Link>
          </Button>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="rounded-full font-semibold text-gold-700 hover:text-gold-800 dark:text-gold-400 dark:hover:text-gold-300"
          >
            <Link href="/build-box">🎁 Build Your Box</Link>
          </Button>
          {categories.map((c) => (
            <Button
              key={c.id}
              asChild
              variant="ghost"
              size="sm"
              className="rounded-full font-medium"
            >
              <Link href={`/products?category=${c.slug}`}>{c.name}</Link>
            </Button>
          ))}
        </div>
      </nav>
    </ScrollHeader>
  );
}
