"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertAdmin } from "@/lib/admin";
import {
  NEXT_STATUSES,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  type OrderStatus,
} from "@/lib/constants";
import { sendOrderStatusEmail } from "@/lib/email";
import { createOrderForCustomer, lookupCustomerByPhone } from "@/lib/admin-orders";
import {
  CheckoutError,
  manualPaymentRef,
  markOrderPaid,
  repriceOrderItems,
} from "@/lib/orders";
import { formatINR, rupeesToPaise } from "@/lib/money";
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

/**
 * Removes an order permanently — for test orders, duplicates and junk.
 *
 * Restricted to PENDING and CANCELLED on purpose, and that restriction is what
 * makes it safe to touch no stock at all: a PENDING order never had stock
 * deducted (only markOrderPaid does that), and a CANCELLED one already had it
 * restored by the branch above — restocking here would double-count. Neither
 * status is in REVENUE_STATUSES either, so P&L, GST and the dashboard don't
 * move. Deleting a paid order would instead erase its captured-payment record
 * and silently rewrite an already-reported month; cancel it first.
 *
 * Prisma cascades take the items, the payment row and any coupon redemption.
 * Freeing that redemption is intended — the purchase never completed. Stock
 * movements survive, referencing an order number that no longer resolves; the
 * ledger stays arithmetically correct, it just can't be clicked through.
 */
export async function deleteOrder(orderId: string) {
  await assertAdmin();

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { status: true, orderNumber: true },
  });
  if (!order) return { error: "Order not found." };

  // Re-checked server-side: the button is hidden for other statuses, but a
  // hidden button is not a permission.
  if (order.status !== "PENDING" && order.status !== "CANCELLED") {
    return {
      error: `Only payment-pending or cancelled orders can be deleted — this one is ${order.status.toLowerCase()}. Cancel it first (that restores the stock), then delete.`,
    };
  }

  await prisma.order.delete({ where: { id: orderId } });

  revalidatePath("/admin/orders");
  revalidatePath(`/order/${order.orderNumber}`);
  return { ok: true };
}

/**
 * Creates an order on a customer's behalf — for orders taken over WhatsApp.
 * Auth only; the work lives in createOrderForCustomer so it stays testable
 * outside a request context.
 */
/** Phone lookup for the new-order form, so returning customers aren't retyped. */
export async function findCustomerByPhone(phone: string) {
  await assertAdmin();
  return lookupCustomerByPhone(phone);
}

export async function createAdminOrder(input: unknown) {
  await assertAdmin();
  const res = await createOrderForCustomer(input);
  if (!res.ok) return { error: res.error };
  revalidatePath("/admin/orders");
  return { ok: true, orderNumber: res.orderNumber };
}

const orderDetailsSchema = z.object({
  shipName: z.string().trim().min(2, "Enter the recipient's name").max(100),
  shipPhone: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"),
  shipLine1: z.string().trim().min(3, "Enter the address").max(200),
  shipLine2: z.string().trim().max(200).optional().or(z.literal("")),
  shipCity: z.string().trim().min(2, "Enter the city").max(100),
  shipState: z.string().trim().min(2, "Select the state").max(100),
  shipPincode: z.string().trim().regex(/^\d{6}$/, "Enter a valid 6-digit pincode"),
  email: z.string().trim().email("Enter a valid email").max(200).optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

/**
 * Corrects the delivery details on an existing order — a wrong flat number or
 * a changed phone, typically after the customer messages about it.
 *
 * Deliberately limited to contact and delivery fields. Items, quantities and
 * prices are NOT editable: they're a snapshot the totals, stock movements, GST
 * and any coupon redemption were all derived from, so editing them after the
 * fact would silently desynchronise money and stock. Cancel and re-create the
 * order instead.
 */
export async function updateOrderDetails(orderId: string, formData: FormData) {
  await assertAdmin();

  const parsed = orderDetailsSchema.safeParse({
    shipName: formData.get("shipName") ?? "",
    shipPhone: formData.get("shipPhone") ?? "",
    shipLine1: formData.get("shipLine1") ?? "",
    shipLine2: formData.get("shipLine2") ?? "",
    shipCity: formData.get("shipCity") ?? "",
    shipState: formData.get("shipState") ?? "",
    shipPincode: formData.get("shipPincode") ?? "",
    email: formData.get("email") ?? "",
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the details." };
  }
  const d = parsed.data;

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return { error: "Order not found." };

  await prisma.order.update({
    where: { id: orderId },
    data: {
      shipName: d.shipName,
      shipPhone: d.shipPhone,
      shipLine1: d.shipLine1,
      shipLine2: d.shipLine2 || null,
      shipCity: d.shipCity,
      shipState: d.shipState,
      shipPincode: d.shipPincode,
      email: d.email ? d.email.toLowerCase() : "",
      notes: d.notes || null,
    },
  });

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath(`/order/${order.orderNumber}`);
  return { ok: true };
}

/**
 * Replaces the items on an unpaid order and reprices it. PENDING only — see
 * repriceOrderItems for why.
 */
export async function updateOrderItems(
  orderId: string,
  items: { variantId: string; qty: number }[],
  couponCode?: string
) {
  await assertAdmin();

  if (!Array.isArray(items) || !items.length) {
    return { error: "An order needs at least one item." };
  }
  if (new Set(items.map((i) => i.variantId)).size !== items.length) {
    return { error: "The same item is listed twice — combine them into one line." };
  }
  if (items.some((i) => !Number.isInteger(i.qty) || i.qty < 1 || i.qty > 99)) {
    return { error: "Quantities must be between 1 and 99." };
  }

  try {
    const order = await repriceOrderItems({ orderId, items, couponCode });
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath(`/order/${order.orderNumber}`);
    return { ok: true, total: order.total };
  } catch (e) {
    if (e instanceof CheckoutError) return { error: e.message };
    console.error("Order item update failed:", e);
    return { error: "Could not update the order. Please try again." };
  }
}

/** Sets the internal packing cost of an order (P&L only). */
export async function updatePackingCost(orderId: string, formData: FormData): Promise<void> {
  await assertAdmin();
  const packingCost = rupeesToPaise(String(formData.get("packingCost") ?? ""));
  if (packingCost === null) return; // invalid input — leave unchanged
  await prisma.order.update({ where: { id: orderId }, data: { packingCost } }).catch(() => {});
  revalidatePath(`/admin/orders/${orderId}`);
}

/**
 * Sets what the courier actually charged for this order (P&L only, never shown
 * to the customer). Separate from `shippingFee`, which is what they paid us —
 * the gap between the two is the real cost of a flat shipping rate.
 */
export async function updateShippingCost(orderId: string, formData: FormData): Promise<void> {
  await assertAdmin();
  const shippingCost = rupeesToPaise(String(formData.get("shippingCost") ?? ""));
  if (shippingCost === null) return; // invalid input — leave unchanged
  await prisma.order.update({ where: { id: orderId }, data: { shippingCost } }).catch(() => {});
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/finance");
}

/**
 * Sets an ad-hoc discount on an unpaid order — the "₹50 off for a regular"
 * agreed over WhatsApp, which no coupon covers.
 *
 * Unpaid only: reducing a total after the customer has paid would leave them
 * out of pocket against what the order now says, and would rewrite revenue for
 * a period that may already have been reported.
 *
 * Stored in `manualDiscount` rather than folded into `discount`, because
 * priceOrderLines recomputes `discount` from scratch on every reprice and would
 * silently erase it the next time the items were edited.
 */
export async function setOrderDiscount(
  orderId: string,
  amountRupees: string,
  note: string
) {
  await assertAdmin();

  const amount = rupeesToPaise(amountRupees);
  if (amount === null || amount < 0) {
    return { error: "Enter a valid discount amount." };
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { payment: true },
  });
  if (!order) return { error: "Order not found." };
  if (order.status !== "PENDING") {
    return {
      error: `Only unpaid orders can be discounted — this one is ${order.status.toLowerCase()}.`,
    };
  }

  // Never let an order owe less than nothing.
  const maxDiscount = Math.max(0, order.subtotal - order.discount);
  if (amount > maxDiscount) {
    return { error: `That's more than the order is worth (max ${formatINR(maxDiscount)}).` };
  }

  const total = order.subtotal - order.discount - amount + order.shippingFee;

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: { manualDiscount: amount, discountNote: note.trim() || null, total },
    });
    // Keep the pending payment (and the UPI QR built from it) in step.
    if (order.payment && order.payment.status !== PAYMENT_STATUSES.CAPTURED) {
      await tx.payment.update({ where: { id: order.payment.id }, data: { amount: total } });
    }
  });

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath(`/order/${order.orderNumber}`);
  return { ok: true, total };
}
