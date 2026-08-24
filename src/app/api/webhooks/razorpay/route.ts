import { NextResponse } from "next/server";
import { CheckoutError, markOrderPaid, markPaymentFailed } from "@/lib/orders";
import { sendUnmatchedPaymentAlert } from "@/lib/email";
import { verifyWebhookSignature } from "@/lib/razorpay";

// Razorpay webhook — source of truth for payment status when the browser
// callback never fires (closed tab, network drop). Configure the same secret
// in the Razorpay dashboard and RAZORPAY_WEBHOOK_SECRET.
export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature");

  if (!signature || !verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  try {
    const event = JSON.parse(rawBody);
    const payment = event?.payload?.payment?.entity;

    switch (event?.event) {
      case "payment.captured":
        if (payment?.order_id) {
          try {
            await markOrderPaid({
              razorpayOrderId: payment.order_id,
              razorpayPaymentId: payment.id,
              method: payment.method,
            });
          } catch (err) {
            if (!(err instanceof CheckoutError)) throw err;
            // No payment row for this Razorpay order — the customer paid an
            // attempt that a later checkout superseded. Retrying can never
            // resolve it, so acknowledge and get a human to refund it rather
            // than let Razorpay redeliver for days.
            console.error(
              `[webhook] captured payment ${payment.id} has no matching order (${payment.order_id})`
            );
            await sendUnmatchedPaymentAlert({
              razorpayOrderId: payment.order_id,
              razorpayPaymentId: payment.id,
              amount: payment.amount,
            }).catch((e) => console.error("Unmatched payment alert failed:", e));
          }
        }
        break;
      case "payment.failed":
        if (payment?.order_id) {
          await markPaymentFailed(payment.order_id);
        }
        break;
      default:
        break; // ignore other events
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Webhook error:", err);
    // 500 so Razorpay retries the delivery
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
