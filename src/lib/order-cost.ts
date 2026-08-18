import { prisma } from "@/lib/prisma";
import { gramsOf } from "@/lib/pricing";

export type OrderCostLine = {
  productName: string;
  variantLabel: string;
  qty: number;
  /** Wholesale cost of this line in paise, or null when it can't be derived */
  cost: number | null;
  revenue: number;
};

export type OrderCost = {
  lines: OrderCostLine[];
  /** Wholesale cost of the goods, paise. Excludes lines we couldn't price. */
  goodsCost: number;
  packingCost: number;
  /** What the courier charged us, paise. 0 means it hasn't been recorded. */
  shippingCost: number;
  /** What the customer paid for shipping, paise */
  shippingIncome: number;
  /** shippingIncome − shippingCost: negative when a flat rate undercharges */
  shippingDelta: number;
  /** True when there's a parcel to pay for but no courier cost recorded */
  shippingCostMissing: boolean;
  totalCost: number;
  /** Goods revenue: subtotal − discount, excluding shipping */
  netRevenue: number;
  margin: number;
  /** Margin as a share of net revenue, or null when there's nothing to divide by */
  marginPct: number | null;
  /**
   * Lines whose cost couldn't be derived — no purchase price, a price of zero,
   * or a non-weight label. Cost is understated and margin overstated by these.
   */
  unknownLines: number;
};

/**
 * Wholesale cost and margin for an order, so an admin can see the headroom
 * before agreeing a bulk discount.
 *
 * Cost comes from the product's current `purchasePricePerKg` × the pack weight
 * parsed from the variant label. That means it reflects what the goods cost
 * *today*, not what they cost when the order was placed — right for deciding a
 * discount now, but not a substitute for the Finance module's historical
 * figures. Shipping appears on both sides — what the customer paid and what the
 * courier charged — because a flat rate can quietly undercharge a heavy parcel.
 */
export async function computeOrderCost(orderId: string): Promise<OrderCost | null> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          variant: {
            select: {
              label: true,
              weightGrams: true,
              unitCost: true,
              product: { select: { purchasePricePerKg: true } },
            },
          },
        },
      },
    },
  });
  if (!order) return null;

  let goodsCost = 0;
  let unknownLines = 0;

  const lines: OrderCostLine[] = order.items.map((item) => {
    const perKg = item.variant?.product.purchasePricePerKg ?? null;
    // Explicit weight wins; the order snapshots the label so this still works
    // if the variant has since been deleted.
    const grams = item.variant?.weightGrams ?? gramsOf(item.variantLabel);
    const revenue = item.price * item.qty;

    // Merchandise isn't bought by the kilo — a per-unit cost takes precedence.
    const unitCost = item.variant?.unitCost ?? null;
    if (unitCost != null && unitCost > 0) {
      const cost = unitCost * item.qty;
      goodsCost += cost;
      return {
        productName: item.productName,
        variantLabel: item.variantLabel,
        qty: item.qty,
        cost,
        revenue,
      };
    }

    // Zero counts as "not set", not as "free": the pricing API accepts 0
    // (z.number().min(0)) and recomputeProductPrices already skips it, so a
    // zero here means nobody has entered a cost. Treating it as a real ₹0 would
    // silently report a 100% margin and invite a discount that loses money.
    if (perKg == null || perKg <= 0 || grams == null) {
      unknownLines++;
      return {
        productName: item.productName,
        variantLabel: item.variantLabel,
        qty: item.qty,
        cost: null,
        revenue,
      };
    }

    const cost = Math.round((perKg * grams) / 1000) * item.qty;
    goodsCost += cost;
    return {
      productName: item.productName,
      variantLabel: item.variantLabel,
      qty: item.qty,
      cost,
      revenue,
    };
  });

  // Shipping now appears on both sides: what the customer paid, and what the
  // courier charged. A flat rate that undercharges shows up as a negative
  // delta, which is otherwise invisible.
  const shippingIncome = order.shippingFee;
  const shippingCost = order.shippingCost;
  const shippingDelta = shippingIncome - shippingCost;
  // Zero is "not recorded", not "free" — same reasoning as a zero wholesale
  // price. Only flag it when a parcel actually went out.
  const shippingCostMissing = shippingCost === 0 && order.items.length > 0;

  const totalCost = goodsCost + order.packingCost + shippingCost;
  const netRevenue = order.subtotal - order.discount - order.manualDiscount;
  const margin = netRevenue + shippingIncome - totalCost;

  return {
    lines,
    goodsCost,
    packingCost: order.packingCost,
    shippingCost,
    shippingIncome,
    shippingDelta,
    shippingCostMissing,
    totalCost,
    netRevenue,
    margin,
    marginPct: netRevenue > 0 ? (margin / netRevenue) * 100 : null,
    unknownLines,
  };
}
