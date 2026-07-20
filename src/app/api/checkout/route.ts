import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  checkoutSchema,
  createOrderFromCart,
  markOrderPaid,
  CheckoutError,
} from "@/lib/orders";
import { getRazorpay, isRazorpayConfigured } from "@/lib/razorpay";
import { getSettings } from "@/lib/queries";
import { SETTINGS } from "@/lib/constants";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Invalid checkout details.";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    // Pre-launch gate — refuse orders while the inauguration notice is set.
    const settings = await getSettings();
    const preLaunch = (settings[SETTINGS.PRE_LAUNCH_NOTICE] ?? "").trim();
    if (preLaunch) {
      return NextResponse.json({ error: preLaunch }, { status: 403 });
    }

    const session = await auth();
    const order = await createOrderFromCart(parsed.data, session?.user?.id);

    // Save the address to the logged-in user's address book for next time
    if (session?.user?.id) {
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

    const rzpOrder = await getRazorpay().orders.create({
      amount: order.total, // paise
      currency: "INR",
      receipt: order.orderNumber,
      notes: { orderNumber: order.orderNumber },
    });

    await prisma.payment.create({
      data: {
        orderId: order.id,
        razorpayOrderId: rzpOrder.id,
        amount: order.total,
        status: "CREATED",
      },
    });

    return NextResponse.json({
      orderNumber: order.orderNumber,
      razorpayOrderId: rzpOrder.id,
      amount: order.total,
      currency: "INR",
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID,
      name: order.shipName,
      email: order.email,
      phone: order.shipPhone,
    });
  } catch (err) {
    if (err instanceof CheckoutError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("Checkout error:", err);
    return NextResponse.json(
      { error: "Something went wrong while placing your order. Please try again." },
      { status: 500 }
    );
  }
}
