import Link from "next/link";
import { getCategories, getSettings } from "@/lib/queries";
import { SETTINGS } from "@/lib/constants";

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center text-muted-foreground transition-colors duration-300 hover:text-primary-600 dark:hover:text-primary-400"
    >
      <span className="relative">
        {children}
        <span className="absolute bottom-0 left-0 h-0.5 w-0 bg-primary-600 transition-all duration-500 group-hover:w-full dark:bg-primary-400" />
      </span>
    </Link>
  );
}

export async function Footer() {
  const [categories, settings] = await Promise.all([getCategories(), getSettings()]);

  return (
    <footer className="mt-16 border-t bg-gradient-to-b from-muted/60 via-muted to-muted/60 dark:from-dark-900 dark:via-dark-950 dark:to-dark-900">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="mb-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-2">
            <div className="mb-4 flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.png"
                alt="Azhagu Thinpandam logo"
                className="size-12 rounded-full shadow-lg"
              />
              <div className="flex flex-col leading-tight">
                <span className="font-heading text-xl font-bold">Azhagu Thinpandam</span>
                <span className="text-xs text-muted-foreground">அழகு திண்பண்டம்</span>
              </div>
            </div>
            <p className="mb-3 font-semibold">The taste of Kovilpatti, delivered.</p>
            <p className="mb-6 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Kadalai mittai, sev, seeval, mixture and more — made fresh in small batches
              with pure ingredients, and shipped across India.
            </p>
            <p className="mb-3 text-sm font-semibold">We accept</p>
            <div className="flex flex-wrap items-center gap-2">
              {["UPI", "Cards", "Netbanking", "Wallets"].map((method) => (
                <div
                  key={method}
                  className="rounded-lg border bg-card px-3 py-2 text-xs font-medium transition-all duration-300 hover:scale-105 hover:border-primary-500 hover:shadow-md"
                >
                  {method}
                </div>
              ))}
              <span className="text-xs text-muted-foreground">· 100% secure payments</span>
            </div>
          </div>

          {/* Shop */}
          <div>
            <h3 className="mb-4 font-bold">Shop</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <FooterLink href="/products">All Products</FooterLink>
              </li>
              {categories.map((c) => (
                <li key={c.id}>
                  <FooterLink href={`/products?category=${c.slug}`}>{c.name}</FooterLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Help + contact */}
          <div>
            <h3 className="mb-4 font-bold">Help</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <FooterLink href="/track-order">Track your order</FooterLink>
              </li>
              <li>
                <FooterLink href="/account">My account</FooterLink>
              </li>
              <li>
                <FooterLink href="/cart">Cart</FooterLink>
              </li>
              <li>
                <FooterLink href="/contact">Contact Us</FooterLink>
              </li>
              <li>
                <FooterLink href="/shipping-policy">Shipping &amp; Delivery Policy</FooterLink>
              </li>
              <li>
                <FooterLink href="/returns">Return &amp; Cancellation Policy</FooterLink>
              </li>
              <li>
                <FooterLink href="/terms">Terms &amp; Conditions</FooterLink>
              </li>
              <li>
                <FooterLink href="/privacy-policy">Privacy Policy</FooterLink>
              </li>
            </ul>
            <h3 className="mb-3 mt-6 font-bold">Contact</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {settings[SETTINGS.STORE_PHONE] && <li>{settings[SETTINGS.STORE_PHONE]}</li>}
              {settings[SETTINGS.STORE_EMAIL] && <li>{settings[SETTINGS.STORE_EMAIL]}</li>}
              {settings[SETTINGS.STORE_ADDRESS] && <li>{settings[SETTINGS.STORE_ADDRESS]}</li>}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t pt-6">
          <div className="flex flex-col items-center justify-between gap-3 text-xs text-muted-foreground md:flex-row">
            <p>© {new Date().getFullYear()} Azhagu Thinpandam. All rights reserved.</p>
            <p>Made with தமிழ் pride in Kovilpatti 🥜</p>
            <p className="flex items-center gap-2">
              Crafted by
              <span className="rounded-md bg-white px-2 py-1 shadow-sm ring-1 ring-black/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/tekspear.webp"
                  alt="TekSpear Solutions — Solutions Made Simple"
                  className="h-4 w-auto"
                />
              </span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
