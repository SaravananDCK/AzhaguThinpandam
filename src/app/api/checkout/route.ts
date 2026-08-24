import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  checkoutSchema,
  createOrderFromCart,
  findReusableOrder,
  reuseOrderForCart,
  manualPaymentRef,
  markOrderPaid,
  CheckoutError,
} from "@/lib/orders";
import { isRazorpayConfigured } from "@/lib/razorpay";
import { ensurePayableRazorpayOrder } from "@/lib/razorpay-order";
import { getManualPaymentConfig } from "@/lib/queries";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Invalid checkout details.";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const manual = await getManualPaymentConfig();

    // Orders require an OTP-verified account: it makes the delivery contact
    // real, ties the order to a customer, and keeps coupon limits honest.
    // The client opens an inline OTP dialog when it sees this 401.
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Please verify your mobile number to place the order.", needsAuth: true },
        { status: 401 }
      );
    }

    // A failed or dismissed gateway payment leaves the order behind, pending.
    // Retrying takes that order over instead of stacking up a second one — the
    // customer keeps a single order number, and only one Razorpay order is ever
    // live for it, so a late capture can't pay for a duplicate.
    const reused = manual.enabled ? null : await findReusableOrder(session.user.id);

    let order = null;
    if (reused) {
      try {
        order = await reuseOrderForCart({ orderId: reused.id, input: parsed.data });
      } catch (err) {
        // A late webhook can capture the abandoned attempt in the gap between
        // picking it up and repricing it. That order is genuinely paid now, so
        // leave it alone and give this checkout a fresh one. Any other refusal
        // — out of stock, a coupon that no longer applies — is the customer's
        // to see, and would come back the same way from a new order anyway.
        const current = await prisma.order.findUnique({
          where: { id: reused.id },
          select: { status: true },
        });
        if (!(err instanceof CheckoutError) || current?.status === "PENDING") throw err;
      }
    }
    order ??= await createOrderFromCart(
      parsed.data,
      session.user.id,
      // Verified identity: phone, or email for accounts that logged in by email
      session.user.phone ?? session.user.email ?? undefined
    );

    // Only when the takeover actually happened. On the fallback above `reused`
    // still points at the order that got captured, and its payment row is a
    // real captured one — writing this checkout's attempt over it would erase
    // the record of money already taken.
    const reusedPayment = reused && order.id === reused.id ? reused.payment : null;

    // Save the address to the user's address book for next time
    {
      const a = parsed.data.address;
      const existing = await prisma.address.findFirst({
        where: { userId: session.user.id, line1: a.line1, pincode: a.pincode },
      });
      if (!existing) {
        const count = await prisma.address.count({ where: { userId: session.user.id } });
        await prisma.address.create({
          data: {
            userId: session.user.id,
            name: a.name,
            phone: a.phone,
            line1: a.line1,
            line2: a.line2 || null,
            city: a.city,
            state: a.state,
            pincode: a.pincode,
            isDefault: count === 0,
          },
        });
      }
    }

    // Manual UPI settlement (payment gateway not live yet): the order is real
    // and PENDING. A placeholder payment row keeps the confirmation path
    // identical to a gateway payment — the admin marking it PAID runs the same
    // markOrderPaid, so stock, coupon redemption and the confirmation email all
    // behave the same way.
    if (manual.enabled) {
      await prisma.payment.create({
        data: {
          orderId: order.id,
          razorpayOrderId: manualPaymentRef(order.orderNumber),
          amount: order.total,
          status: "CREATED",
          method: "upi-manual",
        },
      });
      return NextResponse.json({ manualPayment: true, orderNumber: order.orderNumber });
    }

    // Dev fallback: without Razorpay keys (local testing), simulate a successful
    // payment so the full order flow can be exercised. Never active in production.
    if (!isRazorpayConfigured()) {
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json(
          { error: "Payments are not configured. Please contact the store." },
          { status: 503 }
        );
      }
      await prisma.payment.create({
        data: {
          orderId: order.id,
          razorpayOrderId: `SIMULATED-${order.orderNumber}`,
          amount: order.total,
          status: "CREATED",
        },
      });
      await markOrderPaid({
        razorpayOrderId: `SIMULATED-${order.orderNumber}`,
        razorpayPaymentId: "SIMULATED",
        method: "simulated",
      });
      return NextResponse.json({ simulated: true, orderNumber: order.orderNumber });
    }

    // Reuse the abandoned attempt's still-payable Razorpay order, or mint a
    // fresh one and repoint the payment row — see ensurePayableRazorpayOrder.
    const razorpayOrderId = await ensurePayableRazorpayOrder({
      id: order.id,
      orderNumber: order.orderNumber,
      total: order.total,
      payment: reusedPayment,
    });

    return NextResponse.json({
      orderNumber: order.orderNumber,
      razorpayOrderId,
      amount: order.total,
      currency: "INR",
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID,
      name: order.shipName,
      email: order.email,
      phone: order.shipPhone,
    });
  } catch (err) {
    if (err instanceof CheckoutError) {
      // Logged so a rejected checkout is diagnosable afterwards — these are
      // lost orders, and the 400 alone doesn't say which rule turned them away.
      console.warn("[checkout] rejected:", err.message);
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("Checkout error:", err);
    return NextResponse.json(
      { error: "Something went wrong while placing your order. Please try again." },
      { status: 500 }
    );
  }
}
