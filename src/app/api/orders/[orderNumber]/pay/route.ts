import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CheckoutError } from "@/lib/orders";
import { isRazorpayConfigured } from "@/lib/razorpay";
import { ensurePayableRazorpayOrder } from "@/lib/razorpay-order";
import { getManualPaymentConfig } from "@/lib/queries";

/**
 * Re-arms payment for a pending order so the customer can pay it from the
 * order page instead of rebuilding a cart. Same access model as the order
 * page itself: the unguessable order number is the credential (kept public so
 * WhatsApp/UPI customers can pay without an account), and money only ever
 * moves toward the store — the verify endpoint checks the gateway signature
 * before anything is marked paid.
 */
export async function POST(_req: Request, ctx: { params: Promise<{ orderNumber: string }> }) {
  try {
    const { orderNumber } = await ctx.params;
    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: { payment: true },
    });
    if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });

    if (order.status !== "PENDING") {
      return NextResponse.json(
        { error: "This order is not awaiting payment." },
        { status: 400 }
      );
    }
    // Manual mode has its own instructions on the page; the gateway must not
    // compete with a transfer the customer may already have started.
    const manual = await getManualPaymentConfig();
    if (manual.enabled || !isRazorpayConfigured()) {
      return NextResponse.json(
        { error: "Online payment is not available for this order." },
        { status: 503 }
      );
    }

    const razorpayOrderId = await ensurePayableRazorpayOrder({
      id: order.id,
      orderNumber: order.orderNumber,
      total: order.total,
      payment: order.payment,
    });

    return NextResponse.json({
      razorpayOrderId,
      amount: order.total,
      currency: "INR",
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID,
      orderNumber: order.orderNumber,
      name: order.shipName,
      email: order.email,
      phone: order.shipPhone,
    });
  } catch (err) {
    if (err instanceof CheckoutError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("Pay-now error:", err);
    return NextResponse.json(
      { error: "Could not start the payment. Please try again." },
      { status: 500 }
    );
  }
}
