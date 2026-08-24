import { prisma } from "@/lib/prisma";
import { getRazorpay } from "@/lib/razorpay";
import { CheckoutError } from "@/lib/orders";
import { PAYMENT_STATUSES } from "@/lib/constants";

/**
 * Returns a Razorpay order id that is live and worth exactly `order.total`,
 * with the order's payment row pointing at it — creating either as needed.
 *
 * The existing gateway order is reused only when Razorpay itself says it is
 * still worth the right amount and unpaid. `payment.amount` can't be trusted
 * for that decision: an admin reprice moves the column without touching the
 * gateway, so trusting it would open the popup for a stale figure. Non-gateway
 * refs (manual "UPI-…" placeholders, dev "SIMULATED-…") are simply repointed —
 * that's how a manual-era pending order becomes payable once the gateway is on.
 */
export async function ensurePayableRazorpayOrder(order: {
  id: string;
  orderNumber: string;
  total: number;
  payment: { id: string; razorpayOrderId: string; status: string } | null;
}): Promise<string> {
  if (order.payment?.status === PAYMENT_STATUSES.CAPTURED) {
    // Money already taken — a second gateway order here would invite a second
    // charge. Callers gate on PENDING, so reaching this means a race was lost.
    throw new CheckoutError("This order has already been paid.");
  }

  let reusableId: string | null = null;
  if (order.payment?.razorpayOrderId.startsWith("order_")) {
    try {
      const previous = await getRazorpay().orders.fetch(order.payment.razorpayOrderId);
      if (Number(previous.amount) === order.total && previous.status !== "paid") {
        reusableId = order.payment.razorpayOrderId;
      }
    } catch (e) {
      // Fetch failed (deleted in the dashboard, key rotated, gateway blip) —
      // fall through and create a fresh one rather than fail the payment.
      console.warn("[razorpay] could not fetch existing order:", e);
    }
  }

  const razorpayOrderId =
    reusableId ??
    (
      await getRazorpay().orders.create({
        amount: order.total, // paise
        currency: "INR",
        receipt: order.orderNumber,
        notes: { orderNumber: order.orderNumber },
      })
    ).id;

  if (order.payment) {
    // Points the row at whichever attempt the customer is about to make. A
    // superseded id is no longer in the database, which the webhook handles
    // by alerting the admin instead of retry-looping.
    await prisma.payment.update({
      where: { id: order.payment.id },
      data: {
        razorpayOrderId,
        amount: order.total,
        status: PAYMENT_STATUSES.CREATED,
        razorpayPaymentId: null,
        razorpaySignature: null,
        method: null,
      },
    });
  } else {
    await prisma.payment.create({
      data: {
        orderId: order.id,
        razorpayOrderId,
        amount: order.total,
        status: PAYMENT_STATUSES.CREATED,
      },
    });
  }

  return razorpayOrderId;
}
