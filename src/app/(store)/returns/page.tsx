import type { Metadata } from "next";
import { PolicyContact, PolicyLayout } from "@/components/store/policy-page";

export const metadata: Metadata = {
  title: "Return & Cancellation Policy",
  description:
    "Cancellations, replacements and refunds at Azhagu Thinpandam — how they work for fresh food products.",
  alternates: { canonical: "/returns" },
};

export default function ReturnsPage() {
  return (
    <PolicyLayout title="Return & Cancellation Policy" updated="16 July 2026">
      <h2>Cancelling an order</h2>
      <ul>
        <li>
          You can cancel an order any time <strong>before it is shipped</strong> —
          contact us on WhatsApp or email with your order number.
        </li>
        <li>
          Cancelled orders are refunded in full to your original payment method,
          typically within <strong>5–7 business days</strong> (processed via our
          secure payment gateway).
        </li>
        <li>Once an order has shipped, it can no longer be cancelled.</li>
      </ul>

      <h2>Returns on food products</h2>
      <p>
        Because our snacks and sweets are perishable foods made fresh to order, we
        cannot accept returns of delivered products for change of mind. However, we
        will always make it right if something is wrong:
      </p>
      <ul>
        <li>
          <strong>Damaged, spoiled or wrong items</strong> — contact us within{" "}
          <strong>48 hours of delivery</strong> with your order number and photos of
          the product and packaging.
        </li>
        <li>
          After a quick review we will send a <strong>free replacement</strong> or
          issue a <strong>full refund</strong> for the affected items — your choice.
        </li>
        <li>No need to ship anything back for perishable items.</li>
      </ul>

      <h2>Refund timelines</h2>
      <ul>
        <li>Refunds are initiated within 2 business days of approval.</li>
        <li>
          The amount reaches your bank/UPI/card within 5–7 business days, depending
          on your bank (payment gateway processing timelines apply).
        </li>
      </ul>

      <h2>Delivery issues</h2>
      <p>
        If your order shows as delivered but hasn&apos;t arrived, or is
        significantly delayed, contact us and we&apos;ll trace it with the courier —
        lost shipments are replaced or refunded in full.
      </p>

      <h2>How to reach us</h2>
      <p>
        <PolicyContact />
      </p>
      <p>
        Quote your order number (starts with <strong>AT-</strong>) — you can find it
        in your confirmation email or under My Account → Orders.
      </p>
    </PolicyLayout>
  );
}
