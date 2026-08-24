import type { Metadata } from "next";
import { getDiscountConfig, getShippingConfig, getSettings } from "@/lib/queries";
import { SETTINGS } from "@/lib/constants";
import { whatsappNumber } from "@/lib/upi";
import { getViewerPricing } from "@/lib/viewer";
import { CartView } from "@/components/store/cart-view";
import { UnpaidOrderNotice } from "@/components/store/unpaid-order-notice";

export const metadata: Metadata = { title: "Cart" };

export default async function CartPage() {
  const [{ shippingFee, freeShippingAbove }, discount, { isEmployee }, settings] =
    await Promise.all([
      getShippingConfig(),
      getDiscountConfig(),
      getViewerPricing(),
      getSettings(),
    ]);
  // "Order on WhatsApp" goes to the store number — the habit this replaces was
  // customers screenshotting the cart to whichever number they had (often the
  // supplier's, where it got lost).
  const waNumber = whatsappNumber(settings[SETTINGS.STORE_PHONE] ?? "");


  return (
    <>
      <UnpaidOrderNotice />
      <CartView
        shippingFee={shippingFee}
        freeShippingAbove={freeShippingAbove}
        tiers={discount.tiers}
        discountType={discount.type}
        goodieTiers={discount.goodieTiers}
        isEmployee={isEmployee}
        whatsappNumber={waNumber}
      />
    </>
  );
}
