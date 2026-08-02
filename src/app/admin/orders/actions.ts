"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertAdmin } from "@/lib/admin";
import { NEXT_STATUSES, ORDER_STATUSES, type OrderStatus } from "@/lib/constants";
import { sendOrderStatusEmail } from "@/lib/email";
import { manualPaymentRef, markOrderPaid } from "@/lib/orders";
import { rupeesToPaise } from "@/lib/money";
import { recordMovement, STOCK_REASONS } from "@/lib/stock";

export async function updateOrderStatus(orderId: string, newStatus: string) {
  await assertAdmin();

  if (!ORDER_STATUSES.includes(newStatus as OrderStatus)) {
    return { error: "Invalid status." };
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) return { error: "Order not found." };

  const allowed = NEXT_STATUSES[order.status as OrderStatus] ?? [];
  if (!allowed.includes(newStatus as OrderStatus)) {
    return { error: `Cannot move from ${order.status} to ${newStatus}.` };
  }

  // Confirming a manually-settled order (UPI over WhatsApp). Runs the same
  // markOrderPaid as a gateway payment so stock is decremented, any coupon
  // redemption is recorded and the confirmation email goes out — a bare status
  // write would skip all three. A payment row may not exist (order placed
  // before manual mode, or an abandoned gateway attempt), so ensure one.
  if (order.status === "PENDING" && newStatus === "PAID") {
    const existing = await prisma.payment.findFirst({ where: { orderId: order.id } });
    const ref = existing?.razorpayOrderId ?? manualPaymentRef(order.orderNumber);
    if (!existing) {
      await prisma.payment.create({
        data: {
          orderId: order.id,
          razorpayOrderId: ref,
          amount: order.total,
          status: "CREATED",
          method: "upi-manual",
        },
      });
    }
    try {
      await markOrderPaid({ razorpayOrderId: ref, method: existing?.method ?? "upi-manual" });
    } catch (e) {
      console.error("Manual payment confirmation failed:", e);
      return { error: "Could not confirm the payment. Please try again." };
    }
    // markOrderPaid already sends the order confirmation email — no status email
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath(`/order/${order.orderNumber}`);
    return { ok: true };
  }

  // Cancelling a paid order restores stock
  if (newStatus === "CANCELLED" && order.status !== "PENDING") {
    await prisma.$transaction(async (tx) => {
      await tx.order.update({ where: { id: orderId }, data: { status: newStatus } });
      for (const item of order.items) {
        if (!item.variantId) continue;
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { increment: item.qty } },
        });
        await recordMovement(tx, {
          variantId: item.variantId,
          delta: item.qty,
          reason: STOCK_REASONS.CANCEL_RESTOCK,
          reference: order.orderNumber,
        });
      }
    });
  } else {
    await prisma.order.update({ where: { id: orderId }, data: { status: newStatus } });
  }

  sendOrderStatusEmail(order.orderNumber, newStatus as OrderStatus).catch((e) =>
    console.error("Status email failed:", e)
  );

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath(`/order/${order.orderNumber}`);
  return { ok: true };
}

/** Sets the internal packing cost of an order (P&L only). */
export async function updatePackingCost(orderId: string, formData: FormData): Promise<void> {
  await assertAdmin();
  const packingCost = rupeesToPaise(String(formData.get("packingCost") ?? ""));
  if (packingCost === null) return; // invalid input — leave unchanged
  await prisma.order.update({ where: { id: orderId }, data: { packingCost } }).catch(() => {});
  revalidatePath(`/admin/orders/${orderId}`);
}
