import type { Metadata } from "next";
import { PolicyContact, PolicyLayout } from "@/components/store/policy-page";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "Terms and conditions for shopping at Azhagu Thinpandam.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <PolicyLayout title="Terms & Conditions" updated="16 July 2026">
      <p>
        By using this website and placing an order you agree to the terms below.
        Please read them before ordering.
      </p>

      <h2>About us</h2>
      <p>
        Azhagu Thinpandam sells traditional Tamil snacks and sweets, prepared in
        small batches and shipped across India from Kovilpatti, Tamil Nadu.
      </p>

      <h2>Accounts</h2>
      <p>
        Customer accounts use your mobile number with a one-time code sent via
        WhatsApp — keep your phone secure, as anyone with access to your WhatsApp
        can access your account. You are responsible for the accuracy of the
        delivery details you provide.
      </p>

      <h2>Prices &amp; payment</h2>
      <ul>
        <li>All prices are in Indian Rupees (₹) and include applicable taxes.</li>
        <li>
          Payment is collected at the time of ordering through our secure payment
          gateway (UPI, cards, netbanking, wallets).
        </li>
        <li>
          Prices, discounts and bundle offers may change at any time; the price
          shown at checkout is the price you pay.
        </li>
        <li>
          Obvious pricing errors may be corrected: if we cancel an order for this
          reason you receive a full refund.
        </li>
      </ul>

      <h2>Orders &amp; delivery</h2>
      <ul>
        <li>
          Products are made fresh in small batches — orders are typically
          dispatched within 1–3 business days and delivered within 3–7 business
          days depending on your location.
        </li>
        <li>
          Larger sizes (500 g / 1 kg) are delivered as multiple 250 g packets for
          freshness.
        </li>
        <li>
          If an item becomes unavailable after you order, we will contact you and
          refund the unavailable portion in full.
        </li>
      </ul>

      <h2>Food information</h2>
      <p>
        Our products are prepared in a kitchen that handles{" "}
        <strong>peanuts, sesame, dairy (ghee), and gluten</strong>. If you have
        food allergies, please check the product description or contact us before
        ordering. Being fresh foods without artificial preservatives, products are
        best consumed within the period indicated on the pack.
      </p>

      <h2>Liability</h2>
      <p>
        To the maximum extent permitted by law, our liability for any claim related
        to an order is limited to the amount you paid for that order. Nothing in
        these terms limits liability that cannot be limited under Indian law.
      </p>

      <h2>Governing law</h2>
      <p>
        These terms are governed by the laws of India. Disputes are subject to the
        jurisdiction of the courts of Tamil Nadu.
      </p>

      <h2>Contact</h2>
      <p>
        <PolicyContact />
      </p>
    </PolicyLayout>
  );
}
