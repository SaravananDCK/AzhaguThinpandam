import Script from "next/script";
import { Navbar } from "@/components/store/navbar";
import { Footer } from "@/components/store/footer";
import { ReviewsTab } from "@/components/store/reviews-tab";
import { getSettings } from "@/lib/queries";
import { getViewerPricing } from "@/lib/viewer";
import { SETTINGS } from "@/lib/constants";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  // Google Analytics — customer-facing pages only (admin has its own layout and
  // never loads it). Production-gated so local/dev browsing doesn't pollute the
  // stats; clearing the setting disables it without a deploy.
  const [settings, { isEmployee }] = await Promise.all([getSettings(), getViewerPricing()]);
  const gaId =
    process.env.NODE_ENV === "production"
      ? (settings[SETTINGS.GA_MEASUREMENT_ID] ?? "").trim()
      : "";

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
