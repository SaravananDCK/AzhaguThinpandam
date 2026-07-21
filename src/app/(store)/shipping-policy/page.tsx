import type { Metadata } from "next";
import { PolicyLayout } from "@/components/store/policy-page";

export const metadata: Metadata = {
  title: "Shipping & Delivery Policy",
  description:
    "How Azhagu Thinpandam ships and delivers your Kovilpatti snacks and sweets across India.",
  alternates: { canonical: "/shipping-policy" },
};

export default function ShippingPolicyPage() {
  return (
    <PolicyLayout title="Shipping Policy" updated="21 July 2026">
      <p>
        The orders for the user are shipped through registered domestic courier companies and/or
        speed post only. Orders are shipped within 7 days from the date of the order and/or payment
        or as per the delivery date agreed at the time of order confirmation and delivering of the
        shipment, subject to courier company/post office norms. Azhagu Thinpandam shall not be liable
        for any delay in delivery by the courier company/postal authority.
      </p>
      <p>
        Delivery of all orders will be made to the address provided by the buyer at the time of
        purchase. Delivery of our services will be confirmed on your email ID as specified at the
        time of registration.
      </p>
      <p>
        If there are any shipping cost(s) levied by the seller or the Platform Owner (as the case may
        be), the same is not refundable. Applicable shipping charges, if any, are shown clearly at
        checkout before you pay.
      </p>
      <p>
        You can track your order anytime from the <a href="/track-order">Track Order</a> page using
        your order number, or from My Account → Orders. For any delivery-related queries, please
        contact us using the details on our <a href="/contact">Contact Us</a> page.
      </p>
    </PolicyLayout>
  );
}
