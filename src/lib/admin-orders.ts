import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  adminOrderSchema,
  CheckoutError,
  createOrderFromCart,
  manualPaymentRef,
  markOrderPaid,
} from "@/lib/orders";
import { normalizePhone } from "@/lib/otp";

export type AdminOrderResult =
  | { ok: true; orderNumber: string }
  | { ok: false; error: string };

/**
 * Creates an order on a customer's behalf — for orders taken over WhatsApp.
 *
 * Deliberately routed through createOrderFromCart and markOrderPaid, the same
 * functions the storefront uses, so prices, bundle discounts, shipping, GST and
 * stock can't drift from what a customer would get. The customer account is
 * matched or created from the phone number; no OTP, because the admin is
 * vouching for them.
 *
 * Auth is the caller's job — see the createAdminOrder server action.
 */
export async function createOrderForCustomer(input: unknown): Promise<AdminOrderResult> {
  const parsed = adminOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the order details." };
  }
  const data = parsed.data;

  const phone = normalizePhone(data.address.phone);
  if (!phone) return { ok: false, error: "Enter a valid 10-digit mobile number." };

  const name = (data.customerName || data.address.name).trim();
  const email = (data.email || "").trim().toLowerCase();

  try {
    // Same identity the OTP login would land on, so a WhatsApp order and a
    // later self-service order share one account and one order history.
    let user = await prisma.user.findUnique({ where: { phone } });
    if (!user) {
      user = await prisma.user.create({ data: { phone, name, ...(email ? { email } : {}) } });
    } else if (!user.name && name) {
      user = await prisma.user.update({ where: { id: user.id }, data: { name } });
    }

    const order = await createOrderFromCart({ ...data, email }, user.id, user.phone ?? undefined);

    // Address book, so a later self-service checkout is prefilled
    const a = data.address;
    const existing = await prisma.address.findFirst({
      where: { userId: user.id, line1: a.line1, pincode: a.pincode },
    });
    if (!existing) {
      const count = await prisma.address.count({ where: { userId: user.id } });
      await prisma.address.create({
        data: {
          userId: user.id,
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

    // Placeholder payment row so confirming later follows the manual UPI path
    const ref = manualPaymentRef(order.orderNumber);
    await prisma.payment.create({
      data: {
        orderId: order.id,
        razorpayOrderId: ref,
        amount: order.total,
        status: "CREATED",
        method: "upi-manual",
      },
    });

    // Already settled (the usual case for a WhatsApp order): deducts stock,
    // records any coupon redemption, sends the confirmation email if there is
    // an address to send it to.
    if (data.markPaid) {
      await markOrderPaid({ razorpayOrderId: ref, method: "upi-manual" });
    }

    return { ok: true, orderNumber: order.orderNumber };
  } catch (e) {
    if (e instanceof CheckoutError) return { ok: false, error: e.message };
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: "That email is already linked to another customer." };
    }
    console.error("Admin order creation failed:", e);
    return { ok: false, error: "Could not create the order. Please try again." };
  }
}
