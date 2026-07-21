import type { Metadata } from "next";
import { PolicyLayout } from "@/components/store/policy-page";
import { getSettings } from "@/lib/queries";
import { SETTINGS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Get in touch with AzhaguThinpandam — phone, WhatsApp, email and business address for our Kovilpatti snacks and sweets store.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const settings = await getSettings();
  const name = settings[SETTINGS.STORE_NAME] || "AzhaguThinpandam";
  const phone = settings[SETTINGS.STORE_PHONE];
  const email = settings[SETTINGS.STORE_EMAIL];
  const address = settings[SETTINGS.STORE_ADDRESS];

  return (
    <PolicyLayout title="Contact Us" updated="21 July 2026">
      <p>
        We&apos;d love to hear from you. For questions about your order, our products, wholesale
        enquiries or anything else, reach us through any of the channels below and we&apos;ll get
        back to you as soon as we can.
      </p>

      <h2>Business details</h2>
      <ul>
        <li>
          <strong>Business name:</strong> {name}
        </li>
        {address && (
          <li>
            <strong>Address:</strong> {address}
          </li>
        )}
        {phone && (
          <li>
            <strong>Phone / WhatsApp:</strong>{" "}
            <a href={`tel:+91${phone.replace(/\D/g, "")}`}>{phone}</a>
          </li>
        )}
        {email && (
          <li>
            <strong>Email:</strong> <a href={`mailto:${email}`}>{email}</a>
          </li>
        )}
      </ul>

      <h2>Business hours</h2>
      <p>
        Monday to Saturday, 9:00 AM – 7:00 PM IST. We reply to WhatsApp and email messages within
        one business day.
      </p>

      <h2>Order support</h2>
      <p>
        For help with an existing order, quote your order number (it starts with{" "}
        <strong>AT-</strong>) — you&apos;ll find it in your confirmation email or under My Account →
        Orders. You can also <a href="/track-order">track your order</a> online.
      </p>
    </PolicyLayout>
  );
}
