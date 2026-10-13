// Pre-order (festival combo) rules. Client-safe: no prisma import, so the
// product page, the cart and the server price the same way.
//
// A pre-order product is booked and paid now, and dispatched later. Booking
// closes on a date that depends on the delivery state — parcels to other
// states need a day more on the road, so they close a day earlier. A pre-order
// is always its own order (never mixed with regular items), which keeps festival
// orders separate in the admin and gives each parcel its own delivery charge.
import { isTamilNadu } from "@/lib/shipping";

export type PreorderConfig = {
  /** Last booking day for Tamil Nadu / Puducherry, "YYYY-MM-DD" (IST); "" = no cutoff */
  closeTn: string;
  /** Last booking day for every other state */
  closeOther: string;
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

/**
 * Whether bookings are still open. With a delivery state, that state's cutoff
 * applies; without one (product page, cart — the address isn't known yet) it is
 * open as long as it is open for anyone.
 */
export function isPreorderOpen(
  config: PreorderConfig,
  state?: string | null,
  now: Date = new Date()
): boolean {
  const tn = closeInstant(config.closeTn);
  const other = closeInstant(config.closeOther);
  const open = (close: Date | null) => !close || now < close;
  if (state == null || state.trim() === "") return open(tn) || open(other);
  return open(isTamilNadu(state) ? tn : other);
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

/** "Order by 2 Nov (Tamil Nadu & Puducherry) or 1 Nov (other states)"; "" with no cutoffs. */
export function preorderDeadlineText(config: PreorderConfig): string {
  const tn = formatPreorderDay(config.closeTn);
  const other = formatPreorderDay(config.closeOther);
  if (tn && other) {
    return tn === other
      ? `Order by ${tn}`
      : `Order by ${tn} (Tamil Nadu & Puducherry) or ${other} (other states)`;
  }
  if (tn) return `Tamil Nadu & Puducherry: order by ${tn}`;
  if (other) return `Other states: order by ${other}`;
  return "";
}

/** Why a regular item and a pre-order can't share a cart — shown wherever one is refused. */
export const PREORDER_MIX_MESSAGE =
  "Pre-order combos are booked and shipped on their own. Please check out your current cart first, then add this.";
