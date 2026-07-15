import type { Metadata } from "next";
import { getBoxTiers, getShippingConfig } from "@/lib/queries";
import { CartView } from "@/components/store/cart-view";

export const metadata: Metadata = { title: "Cart" };

export default async function CartPage() {
  const [{ shippingFee, freeShippingAbove }, tiers] = await Promise.all([
    getShippingConfig(),
    getBoxTiers(),
  ]);
  return (
    <CartView shippingFee={shippingFee} freeShippingAbove={freeShippingAbove} tiers={tiers} />
  );
}
