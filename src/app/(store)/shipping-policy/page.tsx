import type { Metadata } from "next";
import { PolicyContact, PolicyLayout } from "@/components/store/policy-page";
import { getSettings } from "@/lib/queries";
import { SETTINGS } from "@/lib/constants";
import { formatINR } from "@/lib/money";

export const metadata: Metadata = {
  title: "Shipping & Delivery Policy",
  description:
    "How Azhagu Thinpandam ships and delivers your Kovilpatti snacks and sweets across India — dispatch times, delivery timelines, charges and tracking.",
  alternates: { canonical: "/shipping-policy" },
};

export default async function ShippingPolicyPage() {
  const settings = await getSettings();
  const fee = parseInt(settings[SETTINGS.SHIPPING_FEE], 10) || 0;
  const freeAbove = parseInt(settings[SETTINGS.FREE_SHIPPING_ABOVE], 10) || 0;

  return (
    <PolicyLayout title="Shipping & Delivery Policy" updated="21 July 2026">
      <h2>Where we deliver</h2>
      <p>
        We ship across India to any serviceable pincode through reputed courier partners.
        If your pincode cannot be serviced, our team will contact you with alternatives or a
        full refund.
      </p>

      <h2>Order processing &amp; dispatch</h2>
      <ul>
        <li>
          Our snacks and sweets are made fresh in small batches. Orders are typically prepared
          and dispatched within <strong>1–3 business days</strong> of payment confirmation.
        </li>
        <li>
          You&apos;ll receive an order confirmation by email, and a tracking reference once your
          parcel is handed over to the courier.
        </li>
      </ul>

      <h2>Delivery timelines</h2>
      <ul>
        <li>
          Estimated delivery is <strong>3–7 business days</strong> after dispatch, depending on
          your location and the courier.
        </li>
        <li>Remote or non-metro pincodes may take a little longer.</li>
        <li>
          These are estimates — actual delivery may vary due to courier operations and factors
          beyond our control.
        </li>
      </ul>

      <h2>Shipping charges</h2>
      <ul>
        <li>
          A flat shipping fee of <strong>{formatINR(fee)}</strong> applies per order.
        </li>
        {freeAbove > 0 && (
          <li>
            <strong>Free shipping</strong> on orders above <strong>{formatINR(freeAbove)}</strong>.
          </li>
        )}
        <li>Any applicable charges are shown clearly at checkout before you pay.</li>
      </ul>

      <h2>Tracking your order</h2>
      <p>
        Track your order anytime from the <a href="/track-order">Track Order</a> page using your
        order number (it starts with <strong>AT-</strong>), or from My Account → Orders.
      </p>

      <h2>Delays</h2>
      <p>
        Occasionally deliveries may be delayed by weather, courier disruptions or public holidays.
        If your order is significantly delayed, or shows as delivered but hasn&apos;t arrived,
        please contact us and we&apos;ll trace it with the courier — lost shipments are replaced or
        refunded in full.
      </p>

      <h2>Contact us</h2>
      <p>
        <PolicyContact />
      </p>
    </PolicyLayout>
  );
}
