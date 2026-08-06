import type { Metadata } from "next";
import { getDiscountConfig, getShippingConfig } from "@/lib/queries";
import { CartView } from "@/components/store/cart-view";

export const metadata: Metadata = { title: "Cart" };

export default async function CartPage() {
  const [{ shippingFee, freeShippingAbove }, discount] = await Promise.all([
    getShippingConfig(),
    getDiscountConfig(),
  ]);
  return (
    <CartView
      shippingFee={shippingFee}
      freeShippingAbove={freeShippingAbove}
      tiers={discount.tiers}
      discountType={discount.type}
      goodieTiers={discount.goodieTiers}
    />
  );
}
