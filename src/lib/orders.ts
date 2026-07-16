import crypto from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { computeShippingFee, getBoxTiers, getSettings, getShippingConfig } from "@/lib/queries";
import { boxDiscount } from "@/lib/box";
import { recordMovement, STOCK_REASONS } from "@/lib/stock";
import { basePacketGrams } from "@/lib/pack";
import { PAYMENT_STATUSES, SETTINGS } from "@/lib/constants";

export const checkoutSchema = z.object({
  email: z.string().email().max(200),
  notes: z.string().max(500).optional(),
  address: z.object({
    name: z.string().trim().min(2).max(100),
    phone: z
      .string()
      .trim()
      .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"),
    line1: z.string().trim().min(3).max(200),
    line2: z.string().trim().max(200).optional().or(z.literal("")),
    city: z.string().trim().min(2).max(100),
    state: z.string().trim().min(2).max(100),
    pincode: z.string().trim().regex(/^\d{6}$/, "Enter a valid 6-digit pincode"),
  }),
  items: z
    .array(
      z.object({
        variantId: z.string().min(1),
        qty: z.number().int().min(1).max(99),
      })
    )
    .min(1)
    .max(50),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export function generateOrderNumber() {
  // Unambiguous alphabet (no 0/O, 1/I/L) — long enough that order URLs are unguessable
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = crypto.randomBytes(8);
  let s = "";
  for (const b of bytes) s += chars[b % chars.length];
  return `AT-${s}`;
}

export class CheckoutError extends Error {}

/**
 * Validates cart items against the database (existence, active flags, stock,
 * current prices) and creates a PENDING order with snapshot items.
 */
export async function createOrderFromCart(input: CheckoutInput, userId?: string) {
  const variantIds = input.items.map((i) => i.variantId);
  if (new Set(variantIds).size !== variantIds.length) {
    throw new CheckoutError("Duplicate items in cart.");
  }

  const variants = await prisma.productVariant.findMany({
    where: { id: { in: variantIds } },
    include: {
      product: {
        include: {
          images: { orderBy: { sortOrder: "asc" } },
          variants: { where: { isActive: true }, select: { label: true } },
        },
      },
    },
  });
  const byId = new Map(variants.map((v) => [v.id, v]));

  const lines = input.items.map((item) => {
    const variant = byId.get(item.variantId);
    if (!variant || !variant.isActive || !variant.product.isActive) {
      throw new CheckoutError(
        "Some items in your cart are no longer available. Please review your cart."
      );
    }
    if (variant.stock < item.qty) {
      throw new CheckoutError(
        `Only ${variant.stock} left of ${variant.product.name} (${variant.label}). Please update your cart.`
      );
    }
    return { variant, qty: item.qty };
  });

  const subtotal = lines.reduce((sum, l) => sum + l.variant.price * l.qty, 0);

  // Tiered bundle discount: N packs (any mix) → % off the whole order.
  // Computed here, never trusted from the client.
  const packCount = lines.reduce((sum, l) => sum + l.qty, 0);
  const tiers = await getBoxTiers();
  const discount = boxDiscount(tiers, packCount, subtotal);

  const shippingConfig = await getShippingConfig();
  const shippingFee = computeShippingFee(subtotal - discount, shippingConfig);
  const total = subtotal - discount + shippingFee;

  // Internal packing cost snapshot (P&L only — never charged to the customer)
  const settings = await getSettings();
  const packingCost = parseInt(settings[SETTINGS.PACKING_COST], 10) || 0;

  const order = await prisma.order.create({
    data: {
      orderNumber: generateOrderNumber(),
      userId: userId ?? null,
      email: input.email.toLowerCase(),
      status: "PENDING",
      shipName: input.address.name,
      shipPhone: input.address.phone,
      shipLine1: input.address.line1,
      shipLine2: input.address.line2 || null,
      shipCity: input.address.city,
      shipState: input.address.state,
      shipPincode: input.address.pincode,
      subtotal,
      discount,
      shippingFee,
      total,
      packingCost,
      notes: input.notes || null,
      items: {
        create: lines.map((l) => ({
          variantId: l.variant.id,
          productName: l.variant.product.name,
          variantLabel: l.variant.label,
          image: l.variant.product.images[0]?.url ?? null,
          price: l.variant.price,
          qty: l.qty,
          basePackGrams: basePacketGrams(l.variant.product.variants.map((v) => v.label)),
        })),
      },
    },
    include: { items: true },
  });

  return order;
}

/**
 * Marks an order as paid and decrements stock. Idempotent — safe to call from
 * both the checkout verify endpoint and the Razorpay webhook.
 */
export async function markOrderPaid(params: {
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  signature?: string;
  method?: string;
}) {
  const payment = await prisma.payment.findUnique({
    where: { razorpayOrderId: params.razorpayOrderId },
    include: { order: { include: { items: true } } },
  });
  if (!payment) throw new CheckoutError("Payment record not found.");

  if (payment.status === PAYMENT_STATUSES.CAPTURED) return payment.order; // already processed

  const updated = await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: PAYMENT_STATUSES.CAPTURED,
        razorpayPaymentId: params.razorpayPaymentId ?? payment.razorpayPaymentId,
        razorpaySignature: params.signature ?? payment.razorpaySignature,
        method: params.method ?? payment.method,
      },
    });
    const order = await tx.order.update({
      where: { id: payment.orderId },
      data: { status: "PAID" },
      include: { items: true },
    });
    for (const item of order.items) {
      if (!item.variantId) continue;
      const before = await tx.productVariant.findUnique({
        where: { id: item.variantId },
        select: { stock: true },
      });
      // Guarded decrement; never lets stock go negative
      await tx.productVariant.updateMany({
        where: { id: item.variantId, stock: { gte: item.qty } },
        data: { stock: { decrement: item.qty } },
      });
      await tx.productVariant.updateMany({
        where: { id: item.variantId, stock: { lt: item.qty } },
        data: { stock: 0 },
      });
      const actualDelta = -Math.min(item.qty, before?.stock ?? item.qty);
      await recordMovement(tx, {
        variantId: item.variantId,
        delta: actualDelta,
        reason: STOCK_REASONS.SALE,
        reference: order.orderNumber,
      });
    }
    return order;
  });

  // Fire-and-forget; email failures must never fail the payment flow
  import("@/lib/email")
    .then(({ sendOrderConfirmationEmail }) => sendOrderConfirmationEmail(updated.orderNumber))
    .catch((e) => console.error("Confirmation email failed:", e));

  return updated;
}

export async function markPaymentFailed(razorpayOrderId: string) {
  const payment = await prisma.payment.findUnique({ where: { razorpayOrderId } });
  if (!payment || payment.status === PAYMENT_STATUSES.CAPTURED) return;
  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: PAYMENT_STATUSES.FAILED },
  });
}
