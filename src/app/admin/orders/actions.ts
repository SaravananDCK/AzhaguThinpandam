"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertAdmin } from "@/lib/admin";
import { NEXT_STATUSES, ORDER_STATUSES, type OrderStatus } from "@/lib/constants";
import { sendOrderStatusEmail } from "@/lib/email";
import { rupeesToPaise } from "@/lib/money";

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
