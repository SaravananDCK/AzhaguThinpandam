import { NextResponse } from "next/server";
import { markOrderPaid, markPaymentFailed } from "@/lib/orders";
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
          await markOrderPaid({
            razorpayOrderId: payment.order_id,
            razorpayPaymentId: payment.id,
            method: payment.method,
          });
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
