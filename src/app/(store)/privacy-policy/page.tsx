import type { Metadata } from "next";
import { PolicyContact, PolicyLayout } from "@/components/store/policy-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How AzhaguThinpandam collects, uses and protects your personal information.",
  alternates: { canonical: "/privacy-policy" },
};

export default function PrivacyPolicyPage() {
  return (
    <PolicyLayout title="Privacy Policy" updated="16 July 2026">
      <p>
        AzhaguThinpandam (&ldquo;we&rdquo;, &ldquo;us&rdquo;) respects your privacy.
        This policy explains what information we collect when you use our website,
        why we collect it, and how we protect it.
      </p>

      <h2>Information we collect</h2>
      <ul>
        <li>
          <strong>Account details</strong> — your mobile number (used for OTP login),
          and optionally your name and email address.
        </li>
        <li>
          <strong>Order details</strong> — delivery name, address, phone number,
          email, and your order history.
        </li>
        <li>
          <strong>Technical data</strong> — your shopping cart is stored in your own
          browser (localStorage) and a login cookie keeps you signed in. We do not
          use advertising or tracking cookies.
        </li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To deliver your orders and send order confirmations and status updates.</li>
        <li>To send one-time login codes to your WhatsApp number.</li>
        <li>To respond to your enquiries and support requests.</li>
        <li>To maintain our accounts and comply with legal requirements.</li>
      </ul>

      <h2>Payments</h2>
      <p>
        All payments are processed securely by our <strong>PCI-DSS compliant payment
        gateway</strong>. We never see or store your card number, UPI PIN or banking
        credentials. The gateway&apos;s handling of your payment data is governed by its own
        privacy policy.
      </p>

      <h2>Who we share data with</h2>
      <p>
        We share only what is necessary to run the store: your delivery details with
        our courier partners, your phone number with our WhatsApp/SMS service
        provider to deliver login codes, and payment information with our payment
        gateway. We never sell your personal information to anyone.
      </p>

      <h2>Data retention &amp; your rights</h2>
      <p>
        Order records are retained for accounting and legal purposes. You may ask us
        at any time to correct your details or delete your account (order records
        required by law are retained even after account deletion). Contact us using
        the details below.
      </p>

      <h2>Contact</h2>
      <p>
        <PolicyContact />
      </p>
    </PolicyLayout>
  );
}
