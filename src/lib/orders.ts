import crypto from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getDiscountConfig, getSettings, getShippingConfig } from "@/lib/queries";
import { computeShipping } from "@/lib/shipping";
import { boxDiscount, goodiesForKg, totalKg } from "@/lib/box";
import { validateCoupon } from "@/lib/coupon";
import { recordMovement, STOCK_REASONS } from "@/lib/stock";
import { basePacketGrams } from "@/lib/pack";
import { staffUnitPrice } from "@/lib/staff-pricing";
import {
  PAYMENT_STATUSES,
  SETTINGS,
  WEIGHT_DISCOUNT_LINES,
  type ProductLine,
} from "@/lib/constants";

export const checkoutSchema = z.object({
  email: z.string().email().max(200),
  notes: z.string().max(500).optional(),
  couponCode: z.string().trim().max(40).optional().or(z.literal("")),
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

/**
 * Orders an admin enters by hand for a customer who ordered over WhatsApp.
 * Same shape as a customer checkout except the email is optional — WhatsApp
 * customers often don't have one, and Order.email is stored as "" in that case
 * (the email senders skip empty addresses). Pricing rules are identical: this
 * goes through createOrderFromCart like any other order, so discounts,
 * shipping, GST and packing cost can't drift from the storefront.
 */
export const adminOrderSchema = checkoutSchema.extend({
  email: z.string().trim().email().max(200).optional().or(z.literal("")),
  customerName: z.string().trim().min(2).max(100).optional().or(z.literal("")),
  markPaid: z.boolean().optional(),
});

export type AdminOrderInput = z.infer<typeof adminOrderSchema>;

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
 * Payment reference for orders settled manually over UPI. Mirrors the shape of
 * a gateway order id so the whole confirmation path (markOrderPaid) is shared.
 */
export function manualPaymentRef(orderNumber: string): string {
  return `UPI-${orderNumber}`;
}

/**
 * Validates cart items against the database (existence, active flags, stock,
 * current prices) and creates a PENDING order with snapshot items.
 *
 * `verifiedIdentity` is the OTP-verified phone — or, for phone-less accounts
 * that logged in by email, the verified email. Coupon limits are keyed to it —
 * never to the delivery phone, which the customer types freely (and would
 * otherwise let them mint a fresh "one per customer" every order).
 */
/**
 * Prices a set of cart lines against the database: validates availability and
 * stock, then computes subtotal, bundle discount, coupon, shipping, packing
 * cost and the GST rate for each line.
 *
 * Shared by checkout and by admin order editing so a repriced order can never
 * drift from what the storefront would have charged.
 */
export async function priceOrderLines(params: {
  items: { variantId: string; qty: number }[];
  state: string;
  couponCode?: string;
  /** OTP-verified identity (phone, or email for phone-less accounts). Coupon
      limits key to it, never to a client-supplied value. */
  couponIdentity: string;
  /** Staff pricing: cost + ₹5 per packet, no discounts, no shipping. Resolved
      from the user record by the caller — never from client input. */
  isEmployee?: boolean;
}) {
  const variantIds = params.items.map((i) => i.variantId);
  if (new Set(variantIds).size !== variantIds.length) {
    throw new CheckoutError("Duplicate items in cart.");
  }
  if (!params.items.length) throw new CheckoutError("An order needs at least one item.");

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

  const lines = params.items.map((item) => {
    const variant = byId.get(item.variantId);
    if (!variant || !variant.isActive || !variant.product.isActive) {
      throw new CheckoutError(
        "Some items in your cart are no longer available. Please review your cart."
      );
    }
    // Made-to-order items are cooked per order, so stock never gates them —
    // this same check also runs for admin-entered and repriced orders.
    if (!variant.product.madeToOrder && variant.stock < item.qty) {
      throw new CheckoutError(
        `Only ${variant.stock} left of ${variant.product.name} (${variant.label}). Please update your cart.`
      );
    }
    return { variant, qty: item.qty };
  });

  // Staff buy at wholesale cost + ₹5 per packet. The flag is resolved from the
  // session's user record by the caller — never from anything client-supplied.
  const isEmployee = params.isEmployee === true;
  const unitPrice = (l: (typeof lines)[number]) =>
    isEmployee ? staffUnitPrice(l.variant, l.variant.product) : l.variant.price;

  const subtotal = lines.reduce((sum, l) => sum + unitPrice(l) * l.qty, 0);

  // Two different weights, and conflating them is a money bug:
  //   shippingKg — every pack in the parcel, since the courier weighs the lot
  //   foodKg     — snacks only, because the bundle discount rewards buying
  //                snacks in bulk
  const shippingKg = totalKg(
    lines.map((l) => ({
      label: l.variant.label,
      qty: l.qty,
      weightGrams: l.variant.weightGrams,
    }))
  );
  const foodLines = lines.filter((l) =>
    WEIGHT_DISCOUNT_LINES.includes(l.variant.product.line as ProductLine)
  );
  const foodKg = totalKg(
    foodLines.map((l) => ({
      label: l.variant.label,
      qty: l.qty,
      weightGrams: l.variant.weightGrams,
    }))
  );
  const foodSubtotal = foodLines.reduce((sum, l) => sum + unitPrice(l) * l.qty, 0);

  // Tiered weight reward: snack weight → % off the snacks (percent mode) or
  // free goodies (goodies mode). Merchandise in the same cart neither counts
  // toward the tier nor earns from it. Computed here, never trusted from the
  // client.
  // Staff already buy at near cost, so none of the customer rewards stack on
  // top — tiers, goodies and coupons are all skipped below.
  const discountConfig = await getDiscountConfig();
  const boxDiscountAmt =
    !isEmployee && discountConfig.type === "percent"
      ? boxDiscount(discountConfig.tiers, foodKg, foodSubtotal)
      : 0;

  // Coupon (optional). The customer gets whichever is larger — the coupon or
  // the box discount, never both. An invalid coupon fails the checkout so the
  // total the customer sees always matches. In goodies mode boxDiscountAmt is
  // 0, so any valid coupon wins outright.
  let discount = boxDiscountAmt;
  let couponId: string | null = null;
  let couponCode: string | null = null;
  // Staff: a code is ignored rather than rejected, so a stale one left in the
  // browser can never block the order. No redemption is recorded either.
  if (params.couponCode && !isEmployee) {
    const result = await validateCoupon({
      code: params.couponCode,
      subtotal,
      phone: params.couponIdentity,
    });
    if (!result.ok) throw new CheckoutError(result.error);
    if (result.discount > boxDiscountAmt) {
      discount = result.discount;
      couponId = result.coupon.id;
      couponCode = result.coupon.code;
    }
  }

  // Goodies mode: free items from the highest reached tier, added as ₹0 lines.
  // One benefit per order — a coupon suppresses the goodies. A goodie is
  // silently skipped when stock can't cover the customer's own purchase of
  // that variant plus the freebie (never blocks checkout over a free item).
  let freebies: { variant: (typeof lines)[number]["variant"]; qty: number }[] = [];
  if (discountConfig.type === "goodies" && !params.couponCode && !isEmployee) {
    const rows = goodiesForKg(
      discountConfig.goodieTiers.filter((g) => g.available),
      foodKg
    );
    if (rows.length) {
      const purchasedQty = new Map(lines.map((l) => [l.variant.id, l.qty]));
      const goodieVariants = await prisma.productVariant.findMany({
        where: { id: { in: rows.map((r) => r.variantId) } },
        include: {
          product: {
            include: {
              images: { orderBy: { sortOrder: "asc" } },
              variants: { where: { isActive: true }, select: { label: true } },
            },
          },
        },
      });
      const gById = new Map(goodieVariants.map((v) => [v.id, v]));
      freebies = rows.flatMap((r) => {
        const v = gById.get(r.variantId);
        if (!v || !v.isActive || !v.product.isActive) return [];
        if (
          !v.product.madeToOrder &&
          v.stock < (purchasedQty.get(v.id) ?? 0) + r.qty
        ) {
          return [];
        }
        return [{ variant: v, qty: r.qty }];
      });
    }
  }
  // Goodies ride in the parcel and the courier weighs the lot, so they count
  // toward shipping weight.
  const parcelKg =
    shippingKg +
    totalKg(
      freebies.map((f) => ({
        label: f.variant.label,
        qty: f.qty,
        weightGrams: f.variant.weightGrams,
      }))
    );

  const shippingConfig = await getShippingConfig();
  // State-aware: inside TN = flat/free-above; outside TN = weight × ₹/kg.
  // Staff collect at the shop, so they're never charged delivery.
  const shippingFee = isEmployee
    ? 0
    : computeShipping({
        state: params.state,
        weightKg: parcelKg,
        subtotal: subtotal - discount,
        config: shippingConfig,
      });
  const total = subtotal - discount + shippingFee;

  // Internal packing cost snapshot (P&L only — never charged to the customer)
  const settings = await getSettings();
  const packingCost = parseInt(settings[SETTINGS.PACKING_COST], 10) || 0;
  // GST rate to snapshot on each line for output-GST reporting (prices are
  // GST-inclusive). Per-product rate, falling back to the store default.
  const defaultGstRate = parseFloat(settings[SETTINGS.DEFAULT_GST_RATE]) || 0;

  const itemData = lines.map((l) => ({
    variantId: l.variant.id,
    productName: l.variant.product.name,
    variantLabel: l.variant.label,
    image: l.variant.product.images[0]?.url ?? null,
    price: unitPrice(l),
    qty: l.qty,
    basePackGrams: basePacketGrams(l.variant.product.variants.map((v) => v.label)),
    gstRate: l.variant.product.gstRate ?? defaultGstRate,
  }));
  // Freebie lines: ₹0, flagged, GST-free (a zero gross has no output GST). A
  // goodie may duplicate a purchased variant — that's simply a second row.
  const freebieData = freebies.map((f) => ({
    variantId: f.variant.id,
    productName: f.variant.product.name,
    variantLabel: f.variant.label,
    image: f.variant.product.images[0]?.url ?? null,
    price: 0,
    qty: f.qty,
    basePackGrams: basePacketGrams(f.variant.product.variants.map((v) => v.label)),
    gstRate: 0,
    isFreebie: true,
  }));

  return {
    lines,
    itemData: [...itemData, ...freebieData],
    subtotal,
    discount,
    couponId,
    couponCode,
    shippingFee,
    total,
    packingCost,
    weightKg: parcelKg,
  };
}

/**
 * Validates cart items against the database (existence, active flags, stock,
 * current prices) and creates a PENDING order with snapshot items.
 *
 * `verifiedIdentity` is the OTP-verified phone on the session — or the verified
 * email for phone-less accounts (customers abroad). Coupon limits are keyed to
 * it — never to the delivery phone, which the customer types freely (and would
 * otherwise let them mint a fresh "one per customer" every order).
 */
export async function createOrderFromCart(
  input: Omit<CheckoutInput, "email"> & { email?: string },
  userId?: string,
  verifiedIdentity?: string
) {
  // Staff pricing is decided by the user record, never by the request body.
  const user = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: { isEmployee: true, name: true },
      })
    : null;
  const isEmployee = user?.isEmployee === true;

  const priced = await priceOrderLines({
    items: input.items,
    state: input.address.state,
    couponCode: input.couponCode || undefined,
    // Verified identity only; the delivery-phone fallback is a last resort for
    // sessions with neither a phone nor an email.
    couponIdentity: verifiedIdentity || input.address.phone,
    isEmployee,
  });
  const { subtotal, discount, couponId, couponCode, shippingFee, total, packingCost } = priced;

  const order = await prisma.order.create({
    data: {
      orderNumber: generateOrderNumber(),
      userId: userId ?? null,
      // "" for admin-entered orders with no email on file (see adminOrderSchema)
      email: input.email?.trim().toLowerCase() ?? "",
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
      couponId,
      couponCode,
      notes: input.notes || null,
      items: { create: priced.itemData },
    },
    include: { items: true },
  });

  // OTP sign-in creates the account with no name, so the first checkout is
  // the first time we learn it. Only fill a blank — never overwrite a name
  // the customer set on their profile.
  if (userId && user && !user.name) {
    await prisma.user.updateMany({
      where: { id: userId, name: null },
      data: { name: input.address.name },
    });
  }

  return order;
}

/**
 * Replaces the items on an unpaid order and reprices it from scratch, using the
 * same rules as the storefront.
 *
 * Restricted to PENDING orders on purpose. Once an order is PAID, stock has
 * been deducted, money has been captured against a specific total and any
 * coupon redemption is recorded — changing items then would need a stock
 * correction and a refund or top-up, so those are cancelled and re-created
 * instead.
 */
export async function repriceOrderItems(params: {
  orderId: string;
  items: { variantId: string; qty: number }[];
  couponCode?: string;
}) {
  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    include: {
      payment: true,
      user: { select: { phone: true, email: true, isEmployee: true } },
    },
  });
  if (!order) throw new CheckoutError("Order not found.");
  if (order.status !== "PENDING") {
    throw new CheckoutError(
      `Only unpaid orders can have their items changed — this one is ${order.status.toLowerCase()}. Cancel it and create a new order instead.`
    );
  }

  const priced = await priceOrderLines({
    items: params.items,
    state: order.shipState,
    couponCode: params.couponCode || undefined,
    // The account's verified identity, else the delivery number — must match
    // the key the redemption would be recorded under in markOrderPaid.
    couponIdentity: order.user?.phone ?? order.user?.email ?? order.shipPhone,
    // A reprice answers "what would we charge now", so an order re-priced after
    // the staff flag was cleared correctly reverts to retail.
    isEmployee: order.user?.isEmployee === true,
  });

  // A manual discount is the admin's decision, not a computed one, so it
  // survives repricing — but it cannot exceed the new amount owed, or the order
  // would total less than nothing after the items shrank.
  const manualDiscount = Math.min(
    order.manualDiscount,
    Math.max(0, priced.subtotal - priced.discount)
  );
  // An admin-set delivery charge is a decision too — recomputing it here would
  // quietly undo it the next time the items changed.
  const shippingFee = order.shippingFeeOverride ?? priced.shippingFee;
  const total = priced.subtotal - priced.discount - manualDiscount + shippingFee;

  return prisma.$transaction(async (tx) => {
    await tx.orderItem.deleteMany({ where: { orderId: order.id } });
    const updated = await tx.order.update({
      where: { id: order.id },
      data: {
        subtotal: priced.subtotal,
        discount: priced.discount,
        manualDiscount,
        shippingFee,
        total,
        packingCost: priced.packingCost,
        couponId: priced.couponId,
        couponCode: priced.couponCode,
        items: { create: priced.itemData },
      },
      include: { items: true },
    });

    // Keep the pending payment in step with the new total, or the UPI QR and
    // the amount the customer is asked for would still show the old figure.
    if (order.payment && order.payment.status !== PAYMENT_STATUSES.CAPTURED) {
      await tx.payment.update({
        where: { id: order.payment.id },
        data: { amount: total },
      });
    }

    return updated;
  });
}

/**
 * A pending order left behind by an abandoned gateway attempt, which this
 * checkout can take over instead of creating a second order.
 *
 * Scoped to gateway attempts by the `order_` prefix Razorpay puts on its order
 * ids. Manual-UPI orders are excluded deliberately: the customer may already
 * have transferred the money outside the system, so overwriting the amount
 * they were told to pay would be worse than a duplicate. Admin-drafted and
 * SIMULATED orders are excluded for the same reason — nothing about them says
 * the customer abandoned a payment.
 */
export async function findReusableOrder(userId: string) {
  return prisma.order.findFirst({
    where: {
      userId,
      status: "PENDING",
      payment: {
        razorpayOrderId: { startsWith: "order_" },
        status: { not: PAYMENT_STATUSES.CAPTURED },
      },
    },
    orderBy: { createdAt: "desc" },
    include: { payment: true },
  });
}

/**
 * Points an abandoned pending order at the current cart, keeping its order
 * number so the customer ends up with one order rather than one per attempt.
 *
 * The address is written before repricing, not after: repriceOrderItems works
 * out shipping from the order's own `shipState`, so a customer who changed
 * their delivery state between attempts would otherwise be charged for the old
 * one.
 */
export async function reuseOrderForCart(params: {
  orderId: string;
  input: Omit<CheckoutInput, "email"> & { email?: string };
}) {
  const a = params.input.address;
  await prisma.order.update({
    where: { id: params.orderId },
    data: {
      email: params.input.email?.trim().toLowerCase() ?? "",
      // Only when the customer actually typed something. An empty box on the
      // retry means "nothing to add", not "erase the note" — and the note on
      // the order may be one an admin left.
      ...(params.input.notes?.trim() ? { notes: params.input.notes.trim() } : {}),
      shipName: a.name,
      shipPhone: a.phone,
      shipLine1: a.line1,
      shipLine2: a.line2 || null,
      shipCity: a.city,
      shipState: a.state,
      shipPincode: a.pincode,
    },
  });

  return repriceOrderItems({
    orderId: params.orderId,
    items: params.input.items,
    couponCode: params.input.couponCode || undefined,
  });
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
    include: {
      order: { include: { items: true, user: { select: { phone: true, email: true } } } },
    },
  });
  if (!payment) throw new CheckoutError("Payment record not found.");

  if (payment.status === PAYMENT_STATUSES.CAPTURED) return payment.order; // already processed

  // Redemptions are keyed to the verified account identity — phone, or email
  // for phone-less accounts (see createOrderFromCart) — so the per-customer
  // limit survives orders shipped to someone else's number. The
  // CouponRedemption.phone column stores whichever identity applied.
  const redemptionIdentity =
    payment.order.user?.phone ?? payment.order.user?.email ?? payment.order.shipPhone;

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
    // Freebie (goodie) lines carry a real variantId, so they decrement stock
    // and get a SALE movement like any sold pack — availability was checked
    // when the order was priced.
    for (const item of order.items) {
      if (!item.variantId) continue;
      const before = await tx.productVariant.findUnique({
        where: { id: item.variantId },
        select: { stock: true, product: { select: { madeToOrder: true } } },
      });

      if (before?.product.madeToOrder) {
        // Made fresh per order: take the full quantity even if that pushes
        // stock negative, which reads as "packs owed". Clamping here would
        // record a zero delta and leave the sale out of the ledger entirely.
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { decrement: item.qty } },
        });
        await recordMovement(tx, {
          variantId: item.variantId,
          delta: -item.qty,
          reason: STOCK_REASONS.SALE,
          reference: order.orderNumber,
        });
        continue;
      }

      // Stocked goods: guarded decrement that never goes negative
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
    // Record the coupon redemption (drives the per-customer limit). orderId is
    // unique, so this is idempotent if the payment flow ever runs twice.
    if (order.couponId) {
      await tx.couponRedemption.upsert({
        where: { orderId: order.id },
        update: {},
        create: { couponId: order.couponId, phone: redemptionIdentity, orderId: order.id },
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
