import { cache } from "react";
import type { Metadata } from "next";
import Script from "next/script";
import { Navbar } from "@/components/store/navbar";
import { CartSyncBridge } from "@/components/store/cart-sync-bridge";
import { Footer } from "@/components/store/footer";
import { ReviewsTab } from "@/components/store/reviews-tab";
import { MetaPixel, MetaPixelNoScript } from "@/components/store/meta-pixel";
import { getSettings } from "@/lib/queries";
import { getViewerPricing } from "@/lib/viewer";
import { SETTINGS } from "@/lib/constants";

// getSettings hits the database on every call, and both generateMetadata and
// the layout itself need it — cache() collapses that to one query per request.
const settingsOnce = cache(getSettings);

/**
 * Meta's domain-verification tag. It lives on the customer-facing layout so it
 * covers the domain root Meta actually crawls, and — unlike the pixel — is not
 * production-gated: the token is inert on its own, and gating it would mean a
 * staging deploy silently fails verification.
 */
export async function generateMetadata(): Promise<Metadata> {
  const settings = await settingsOnce();
  const token = (settings[SETTINGS.META_DOMAIN_VERIFICATION] ?? "").trim();
  if (!token) return {};
  return { verification: { other: { "facebook-domain-verification": token } } };
}

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  // Google Analytics and the Meta Pixel — customer-facing pages only (admin has
  // its own layout and never loads them). Production-gated so local/dev browsing
  // doesn't pollute the stats; clearing the setting disables either one without
  // a deploy.
  const [settings, { isEmployee }] = await Promise.all([settingsOnce(), getViewerPricing()]);
  const isLive = process.env.NODE_ENV === "production";
  const gaId = isLive ? (settings[SETTINGS.GA_MEASUREMENT_ID] ?? "").trim() : "";
  const pixelId = isLive ? (settings[SETTINGS.META_PIXEL_ID] ?? "").trim() : "";

  return (
    <>
      {gaId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`}
            strategy="afterInteractive"
          />
          <Script id="ga-init" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', ${JSON.stringify(gaId)});`}
          </Script>
        </>
      )}
      {pixelId && (
        <>
          <MetaPixel pixelId={pixelId} />
          <MetaPixelNoScript pixelId={pixelId} />
        </>
      )}
      <CartSyncBridge />
      <Navbar />
      {/* Staff see a different price list — say so, everywhere, unprompted */}
      {isEmployee && (
        <p className="bg-gold-100 px-4 py-1.5 text-center text-xs font-medium text-gold-900 dark:bg-gold-950/60 dark:text-gold-200">
          <strong>Staff pricing</strong> — you&apos;re seeing employee prices (cost + ₹5 per
          packet). No discounts, coupons or delivery charge; collect at the shop.
        </p>
      )}
      <main className="flex-1">{children}</main>
      <ReviewsTab />
      <Footer />
    </>
  );
}
