"use client";

import { useEffect } from "react";
import { waitForFbq } from "@/lib/fbq";

export type PurchaseContent = {
  id: string;
  quantity: number;
  item_price: number; // rupees
};

/**
 * Fires the Meta Pixel `Purchase` event, once per order.
 *
 * Rendered by the order page only when the order is actually paid — a placed
 * but unpaid order (manual UPI, or a gateway attempt that failed) must not
 * count as revenue. That also makes this the one place the event can live:
 * the order page is where every successful path lands, whether the customer
 * paid at checkout, retried with "Pay now" (the page re-renders as paid), or
 * came back to a link after the webhook captured the payment.
 *
 * The order page is a tracking page customers revisit, so the fire is guarded
 * by a localStorage marker rather than trusting a single mount. `eventID` is
 * sent so a future Conversions API call can be deduplicated against this one.
 */
export function PurchasePixel({
  orderNumber,
  value,
  contents,
  numItems,
}: {
  orderNumber: string;
  value: number; // rupees
  contents: PurchaseContent[];
  numItems: number;
}) {
  useEffect(() => {
    const key = `fbq_purchase_${orderNumber}`;
    try {
      if (localStorage.getItem(key)) return;
    } catch {
      // Private mode or storage disabled — fall through and fire. A duplicate
      // on a reload beats never recording the sale.
    }

    let cancelled = false;
    (async () => {
      // The base snippet loads afterInteractive, so on a hard load of this page
      // effects can beat it. Wait for it the same way PayNow waits for
      // Razorpay — marking the order sent before fbq exists would burn the
      // guard and lose the conversion permanently.
      const fbq = await waitForFbq();
      if (cancelled || !fbq) return;
      try {
        localStorage.setItem(key, "1");
      } catch {
        // Same as above — unstorable, still worth sending.
      }
      fbq(
        "track",
        "Purchase",
        {
          value,
          currency: "INR",
          content_type: "product",
          content_ids: contents.map((c) => c.id),
          contents,
          num_items: numItems,
        },
        { eventID: orderNumber }
      );
    })();

    return () => {
      cancelled = true;
    };
    // Keyed on the order alone: a paid order's total and items never change,
    // and `contents` is a fresh array every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderNumber]);

  return null;
}
