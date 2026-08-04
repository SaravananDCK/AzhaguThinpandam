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
  totalCost: number;
  /** What the store keeps for the goods: subtotal − discount, excluding shipping */
  netRevenue: number;
  margin: number;
  /** Margin as a share of net revenue, or null when there's nothing to divide by */
  marginPct: number | null;
  /** Lines with no purchase price or a non-weight label — cost is understated */
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
 * figures. Shipping is excluded on both sides: it's collected from the customer
 * and paid straight out to the courier.
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
    // The order snapshots the label, so this still works if the variant is gone
    const grams = gramsOf(item.variantLabel);
    const revenue = item.price * item.qty;

    // No purchase price set, or a label like "Combo" with no weight to price
    if (perKg == null || grams == null) {
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

  const totalCost = goodsCost + order.packingCost;
  const netRevenue = order.subtotal - order.discount;
  const margin = netRevenue - totalCost;

  return {
    lines,
    goodsCost,
    packingCost: order.packingCost,
    totalCost,
    netRevenue,
    margin,
    marginPct: netRevenue > 0 ? (margin / netRevenue) * 100 : null,
    unknownLines,
  };
}
