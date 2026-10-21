// Pre-order (festival combo) rules. Client-safe: no prisma import, so the
// product page, the cart and the server price the same way.
//
// A pre-order product is booked and paid now, and dispatched later. Booking
// closes at the end of one date. Combos are delivered only within Tamil Nadu
// and Puducherry, and the combo price includes delivery — no delivery charge
// is ever added. A pre-order is always its own order (never mixed with regular
// items), which keeps festival orders separate in the admin.
import { isTamilNadu } from "@/lib/shipping";

export type PreorderConfig = {
  /** Last booking day, "YYYY-MM-DD" (IST); "" = no cutoff */
  closeDay: string;
  /** Shown to the customer, e.g. "Dispatched from 3 November, in time for Diwali" */
  dispatchNote: string;
};

const IST_OFFSET_MS = 5.5 * 3600 * 1000;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** The instant booking closes: the end of that day in India. Null = never closes. */
function closeInstant(day: string): Date | null {
  const m = day.trim().match(DATE_RE);
  if (!m) return null;
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3] + 1) - IST_OFFSET_MS);
}

/** Whether bookings are still open. */
export function isPreorderOpen(config: PreorderConfig, now: Date = new Date()): boolean {
  const close = closeInstant(config.closeDay);
  return !close || now < close;
}

/** Whether a pre-order can be delivered to this state: Tamil Nadu and Puducherry only. */
export function isPreorderDeliverable(state: string | null | undefined): boolean {
  return isTamilNadu(state);
}

/** "1 Nov" for "2026-11-01"; "" when unset or invalid. */
export function formatPreorderDay(day: string): string {
  const m = day.trim().match(DATE_RE);
  if (!m) return "";
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/** "Order by 2 Nov"; "" with no cutoff. */
export function preorderDeadlineText(config: PreorderConfig): string {
  const day = formatPreorderDay(config.closeDay);
  return day ? `Order by ${day}` : "";
}

/** Where combos go and what the price covers — shown wherever a pre-order is offered. */
export const PREORDER_DELIVERY_NOTE =
  "Delivered within Tamil Nadu & Puducherry only. Delivery is included in the price.";

/** Checkout refusal for an address outside the delivery area. */
export const PREORDER_AREA_MESSAGE =
  "Pre-order combos are delivered only within Tamil Nadu and Puducherry. Please choose a delivery address there.";

/** Why a regular item and a pre-order can't share a cart — shown wherever one is refused. */
export const PREORDER_MIX_MESSAGE =
  "Pre-order combos are booked and shipped on their own. Please check out your current cart first, then add this.";
