import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";
import { getManualPaymentConfig, getPreorderConfig } from "@/lib/queries";
import { isRazorpayConfigured } from "@/lib/razorpay";
import { upiPayLink, whatsappOrderLink } from "@/lib/upi";
import { paiseToRupees } from "@/lib/money";
import { apiOrigin, serializeOrder } from "@/lib/api-serialize";

type Ctx = { params: Promise<{ orderNumber: string }> };

/**
 * One of the signed-in customer's orders, with what its screen needs: how to
 * pay while it's pending, the dispatch note for a pre-order, and the review.
 * Owner-only — unlike the website's order page, which the order number alone
 * opens so WhatsApp customers can track without an account.
 */
export async function GET(req: Request, { params }: Ctx) {
  const { user, response } = await requireUser();
  if (response) return response;
  const { orderNumber } = await params;

  const order = await prisma.order.findFirst({
    where: { orderNumber: orderNumber.toUpperCase(), userId: user.id },
    include: {
      items: true,
      payment: true,
      review: {
        select: {
          rating: true,
          tasteRating: true,
          packingRating: true,
          deliveryRating: true,
          title: true,
          body: true,
          status: true,
        },
      },
    },
  });
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });

  const origin = apiOrigin(req);
  const pending = order.status === "PENDING";
  const manual = pending ? await getManualPaymentConfig() : null;

  // How to settle a pending order. "upi": transfer and send the screenshot.
  // "gateway": POST /api/orders/{orderNumber}/pay for a Razorpay order, then
  // /api/checkout/verify with the result. Null when nothing is owed.
  let payment = null;
  if (pending && manual?.enabled) {
    payment = {
      mode: "upi" as const,
      upiId: manual.upiId || null,
      upiLink: upiPayLink({
        upiId: manual.upiId,
        payeeName: manual.payeeName,
        amountPaise: order.total,
        orderNumber: order.orderNumber,
      }),
      whatsappLink: whatsappOrderLink({
        phone: manual.whatsappPhone,
        orderNumber: order.orderNumber,
        amountRupees: paiseToRupees(order.total),
      }),
      note: manual.pendingNote || null,
    };
  } else if (
    pending &&
    isRazorpayConfigured() &&
    !order.payment?.razorpayOrderId.startsWith("SIMULATED")
  ) {
    payment = { mode: "gateway" as const };
  }

  const waiting = ["PENDING", "PAID", "CONFIRMED"].includes(order.status);
  return NextResponse.json({
    order: {
      ...serializeOrder(order, origin),
      payment,
      preorderNote:
        order.preorder && waiting ? (await getPreorderConfig()).dispatchNote || null : null,
      // Reviews open once the order is delivered: POST /api/orders/{orderNumber}/review
      canReview: order.status === "DELIVERED",
      review: order.review,
      webUrl: `${origin}/order/${order.orderNumber}`,
    },
  });
}
