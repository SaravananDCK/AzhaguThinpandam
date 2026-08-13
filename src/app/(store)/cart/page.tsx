import type { Metadata } from "next";
import { getDiscountConfig, getShippingConfig } from "@/lib/queries";
import { getViewerPricing } from "@/lib/viewer";
import { CartView } from "@/components/store/cart-view";

export const metadata: Metadata = { title: "Cart" };

export default async function CartPage() {
  const [{ shippingFee, freeShippingAbove }, discount, { isEmployee }] = await Promise.all([
    getShippingConfig(),
    getDiscountConfig(),
    getViewerPricing(),
  ]);
  return (
    <CartView
      shippingFee={shippingFee}
      freeShippingAbove={freeShippingAbove}
      tiers={discount.tiers}
      discountType={discount.type}
      goodieTiers={discount.goodieTiers}
      isEmployee={isEmployee}
    />
  );
}
