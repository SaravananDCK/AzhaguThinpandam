import { NextResponse } from "next/server";
import { z } from "zod";
import { markOrderPaid, CheckoutError } from "@/lib/orders";
import { verifyPaymentSignature } from "@/lib/razorpay";

const verifySchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const parsed = verifySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payment details." }, { status: 400 });
    }
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data;

    const valid = verifyPaymentSignature({
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });
    if (!valid) {
      return NextResponse.json(
        { error: "Payment verification failed. If money was deducted it will be refunded." },
        { status: 400 }
      );
    }

    const order = await markOrderPaid({
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });

    return NextResponse.json({ orderNumber: order.orderNumber });
  } catch (err) {
    if (err instanceof CheckoutError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("Verify error:", err);
    return NextResponse.json({ error: "Verification failed." }, { status: 500 });
  }
}
