import { NextResponse } from "next/server";
import {
  getDiscountConfig,
  getManualPaymentConfig,
  getPreorderConfig,
  getSettings,
  getShippingConfig,
} from "@/lib/queries";
import { SETTINGS } from "@/lib/constants";
import { isRazorpayConfigured } from "@/lib/razorpay";
import { INDIAN_STATES } from "@/lib/india-states";
import { PREORDER_DELIVERY_NOTE, preorderDeadlineText } from "@/lib/preorder";
import { absoluteUrl, apiOrigin } from "@/lib/api-serialize";

/**
 * Store-wide settings the app reads at launch: contact details, how delivery
 * is charged, the weight-discount tiers, and which payment flow is live. The
 * app uses these to explain prices; the amounts themselves always come from
 * /api/v1/cart/price.
 */
export async function GET(req: Request) {
  const origin = apiOrigin(req);
  const [settings, shipping, discount, manual, preorder] = await Promise.all([
    getSettings(),
    getShippingConfig(),
    getDiscountConfig(),
    getManualPaymentConfig(),
    getPreorderConfig(),
  ]);

  return NextResponse.json({
    store: {
      name: settings[SETTINGS.STORE_NAME],
      phone: settings[SETTINGS.STORE_PHONE],
      email: settings[SETTINGS.STORE_EMAIL],
      address: settings[SETTINGS.STORE_ADDRESS],
    },
    states: INDIAN_STATES,
    shipping,
    discount: {
      type: discount.type,
      /** kg → percent off the snacks */
      tiers: discount.tiers.map((t) => ({ kg: t.count, percent: t.percent })),
      /** kg → free items, when type is "goodies". Only rows currently on offer. */
      goodies: discount.goodieTiers
        .filter((g) => g.available)
        .map((g) => ({
          kg: g.kg,
          productName: g.productName,
          variantLabel: g.variantLabel,
          qty: g.qty,
          image: absoluteUrl(g.image, origin),
        })),
    },
    payment: {
      /** "upi": pay by UPI and send a screenshot. "gateway": Razorpay checkout. */
      mode: manual.enabled ? "upi" : isRazorpayConfigured() ? "gateway" : "unavailable",
      razorpayKeyId: manual.enabled
        ? null
        : process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || null,
      notice: manual.enabled ? manual.notice || null : null,
    },
    preorder: {
      deadline: preorderDeadlineText(preorder),
      dispatchNote: preorder.dispatchNote,
      /** Combos go to Tamil Nadu / Puducherry only, delivery included */
      deliveryNote: PREORDER_DELIVERY_NOTE,
    },
  });
}
