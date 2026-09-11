import type { Metadata } from "next";
import { PolicyContact, PolicyLayout } from "@/components/store/policy-page";

export const metadata: Metadata = {
  title: "Shipping & Delivery Policy",
  description:
    "How Azhagu Thinpandam ships and delivers your Kovilpatti snacks and sweets across India — dispatch times, delivery estimates, charges and what to do if a parcel is late, lost or damaged.",
  alternates: { canonical: "/shipping-policy" },
};

export default function ShippingPolicyPage() {
  return (
    <PolicyLayout title="Shipping &amp; Delivery Policy" updated="10 September 2026">
      <p>
        This policy explains how orders placed on azhaguthinpandam.com are processed, dispatched and
        delivered, what shipping costs, and what to do if a parcel is delayed, lost, damaged or not
        delivered. All orders are shipped through registered domestic courier companies and/or
        India Post (Speed Post) only. We ship within India.
      </p>

      <h2>1. Order processing and dispatch timeline</h2>
      <p>
        Our snacks and sweets are made fresh in small batches after your order is confirmed, so
        &ldquo;processing&rdquo; is the time we take to prepare and pack the order before it leaves
        us. Dispatch is the moment the parcel is handed to the courier.
      </p>
      <ul>
        <li>
          <strong>Processing time:</strong> 1–3 business days from the date your payment is
          confirmed (Monday to Saturday, excluding public holidays).
        </li>
        <li>
          <strong>Dispatch:</strong> orders are dispatched within a maximum of 7 days from the date
          of order and/or payment, or on the dispatch date agreed with you at the time of order
          confirmation (for example, a festival pre-order or a bulk order).
        </li>
        <li>
          You receive an order confirmation by email/WhatsApp when the order is placed, and a
          dispatch notification with the courier name and tracking number as soon as the parcel is
          shipped. Orders placed after 2:00 PM IST or on Sundays/holidays are processed from the
          next business day.
        </li>
      </ul>

      <h2>2. Estimated delivery timeline (after dispatch)</h2>
      <p>
        Delivery time is counted from the dispatch date, not from the order date, and depends on the
        destination. Typical estimates:
      </p>
      <ul>
        <li>
          <strong>Within Tamil Nadu:</strong> 2–4 business days after dispatch.
        </li>
        <li>
          <strong>Rest of South India</strong> (Kerala, Karnataka, Andhra Pradesh, Telangana,
          Puducherry): 3–6 business days after dispatch.
        </li>
        <li>
          <strong>Rest of India:</strong> 5–10 business days after dispatch.
        </li>
        <li>
          <strong>Remote, hilly, island and North-East locations:</strong> may take up to 15
          business days after dispatch, depending on courier/India Post serviceability.
        </li>
      </ul>
      <p>
        So, in total, most orders reach you within 3–7 business days inside Tamil Nadu and within
        6–13 business days elsewhere in India. These are estimates based on courier performance and
        are not guaranteed: weather, strikes, festival rush, regional restrictions and courier
        network delays can extend them. Azhagu Thinpandam is not liable for delays caused by the
        courier company or postal authority once the parcel has been dispatched, but we will follow
        up with the courier on your behalf (see section 5).
      </p>

      <h2>3. Shipping charges</h2>
      <ul>
        <li>
          <strong>Within Tamil Nadu:</strong> a flat shipping fee is charged per order, and shipping
          is <strong>free</strong> above the order value shown in the cart.
        </li>
        <li>
          <strong>Outside Tamil Nadu:</strong> shipping is charged by the parcel weight (per kg,
          rounded up to the next whole kg) and is not eligible for the free-shipping offer.
        </li>
        <li>
          The exact shipping charge for your address is always shown at checkout, before you pay.
          Shipping charges, once an order has been dispatched, are not refundable except where
          section 5 says otherwise.
        </li>
      </ul>

      <h2>4. Delivery address and tracking</h2>
      <ul>
        <li>
          Orders are delivered to the address you provide at checkout. Please make sure the address,
          PIN code and mobile number are correct; we cannot change the address after dispatch, and
          parcels returned to us because of an incorrect or incomplete address are treated under
          section 5(d).
        </li>
        <li>
          You can track your order at any time from the <a href="/track-order">Track Order</a> page
          using your order number, or from My Account → Orders. The tracking number is also in your
          dispatch email/WhatsApp message.
        </li>
        <li>
          Someone should be available to receive the parcel. Couriers usually make 2–3 delivery
          attempts and may call the mobile number on the order.
        </li>
      </ul>

      <h2>5. Lost, delayed, damaged or undelivered shipments</h2>
      <p>
        Please contact us on WhatsApp/phone or email (details at the end of this page) with your
        order number. Our procedure for each case:
      </p>
      <ul>
        <li>
          <strong>(a) Delayed shipment.</strong> If your parcel has not arrived within the estimated
          delivery window in section 2, contact us. We will raise a query with the courier within 1
          business day and keep you updated. Most delays are resolved within 3–5 business days. If
          the courier confirms the parcel cannot be delivered, we treat it as lost (see b).
        </li>
        <li>
          <strong>(b) Lost shipment.</strong> If the courier confirms the parcel is lost in transit,
          or tracking shows no movement for 10 business days after dispatch and the courier cannot
          locate it, we will, at your choice, either re-ship the same order at no extra cost or
          refund the full amount paid, including shipping charges. Refunds are issued to the
          original payment method within 7 business days of our confirmation.
        </li>
        <li>
          <strong>(c) Damaged shipment.</strong> If the outer packaging is visibly damaged or
          tampered at the time of delivery, please refuse the parcel if possible, or accept it and
          contact us within <strong>48 hours</strong> of delivery with photos of the outer box, the
          packing and the affected items. After verification we will replace the damaged items free
          of charge, or refund their value if a replacement is not possible. Because our products
          are perishable food items, we cannot accept damage claims raised more than 48 hours after
          delivery. See also our <a href="/returns">Refund, Cancellation &amp; Return Policy</a>.
        </li>
        <li>
          <strong>(d) Undelivered / returned-to-origin shipment.</strong> If a parcel comes back to
          us because the address was incorrect or incomplete, the customer was unreachable, or
          delivery was refused, we will contact you. You may ask us to re-ship it, in which case the
          re-shipping charge is payable by you; or you may cancel, in which case we refund the
          product value minus the original shipping charge. Because the products are perishable, a
          returned parcel that is no longer fit for consumption cannot be re-shipped and only the
          refund option applies.
        </li>
        <li>
          <strong>(e) Wrong or missing items.</strong> Contact us within 48 hours of delivery with a
          photo of what you received. We will send the correct/missing items at no cost, or refund
          their value.
        </li>
      </ul>
      <p>
        We may ask for the tracking details, photos or a short written confirmation to process a
        claim with the courier. Approved refunds take up to 7 business days to reach your account
        after we confirm them, depending on your bank.
      </p>

      <h2>6. Contact for shipping queries</h2>
      <p>
        <PolicyContact />
      </p>
      <p>
        Business hours: Monday to Saturday, 9:00 AM – 7:00 PM IST. See our{" "}
        <a href="/contact">Contact Us</a> page for all ways to reach us.
      </p>
    </PolicyLayout>
  );
}
