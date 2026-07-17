import Link from "next/link";
import { User } from "lucide-react";
import { auth } from "@/lib/auth";
import { getCategories } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { CartButton } from "@/components/store/cart-button";
import { MobileNav } from "@/components/store/mobile-nav";
import { NavSearch } from "@/components/store/nav-search";
import { ScrollHeader } from "@/components/store/scroll-header";
import { ThemeToggle } from "@/components/store/theme-toggle";

function PillLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-full px-4 py-2 text-base font-medium text-foreground/80 transition-all duration-300 hover:bg-accent hover:text-foreground group-data-[scrolled=true]/header:px-3 group-data-[scrolled=true]/header:py-1.5 group-data-[scrolled=true]/header:text-sm"
    >
      {children}
    </Link>
  );
}

export async function Navbar() {
  const [categories, session] = await Promise.all([getCategories(), auth()]);

  return (
    <ScrollHeader>
      <div className="px-3 pt-3 sm:pt-4">
        {/* Floating pill — hugs its content; large logo + category row at rest,
            compacts to a single row on scroll */}
        <div className="flex justify-center">
          <div className="pointer-events-auto flex items-center gap-3 rounded-[1.75rem] border border-border/60 bg-background/80 px-3 py-3 shadow-lg shadow-black/[0.06] backdrop-blur-xl transition-all duration-300 dark:shadow-black/30 group-data-[scrolled=true]/header:gap-2 group-data-[scrolled=true]/header:rounded-full group-data-[scrolled=true]/header:px-2 group-data-[scrolled=true]/header:py-2">
            {/* Mobile menu */}
            <MobileNav categories={categories} />

            {/* Logo — large at rest, spans both rows; compacts on scroll */}
            <Link href="/" className="group flex shrink-0 items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.png"
                alt="AzhaguThinpandam logo"
                className="size-24 shrink-0 rounded-full shadow-sm transition-all duration-300 group-hover:scale-105 group-data-[scrolled=true]/header:size-11"
              />
            </Link>

            {/* Right column: top row + category row */}
            <div className="flex flex-col">
              {/* Top row */}
              <div className="flex items-center gap-3 group-data-[scrolled=true]/header:gap-2">
                <Link href="/" className="hidden flex-col leading-tight sm:flex">
                  <span className="font-heading text-xl font-bold tracking-tight text-primary transition-all duration-300 group-data-[scrolled=true]/header:text-base">
                    AzhaguThinpandam
                  </span>
                  <span className="text-xs text-muted-foreground transition-all duration-300 group-data-[scrolled=true]/header:text-[11px]">
                    அழகு திண்பண்டம்
                  </span>
                </Link>

                {/* Center: primary links (desktop) */}
                <nav className="hidden items-center gap-1 md:flex">
                  <PillLink href="/products">Shop</PillLink>
                  <PillLink href="/build-box">🎁 Build Your Box</PillLink>
                  <PillLink href="/track-order">Track Order</PillLink>
                </nav>

                {/* Right: utilities + cart CTA */}
                <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
                  <NavSearch />
                  <ThemeToggle />
                  <Button
                    asChild
                    variant="ghost"
                    size="icon"
                    aria-label="Account"
                    className="hidden rounded-full transition-transform hover:scale-110 active:scale-95 sm:inline-flex"
                  >
                    <Link href={session?.user ? "/account" : "/login"}>
                      <User className="size-5" />
                    </Link>
                  </Button>
                  <CartButton />
                </div>
              </div>

              {/* Category row (desktop) — hidden once compacted */}
              <div className="hidden max-h-16 overflow-hidden transition-all duration-300 md:block group-data-[scrolled=true]/header:max-h-0 group-data-[scrolled=true]/header:opacity-0">
                <nav className="flex items-center gap-1 pt-2">
                  <Button asChild variant="ghost" size="sm" className="rounded-full font-medium">
                    <Link href="/products">All Products</Link>
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
                </nav>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ScrollHeader>
  );
}
