// Order and product analysis for the Finance page.
//
// Margins here are PER ORDER, from orderCostOf: each line's wholesale cost at
// today's purchase price, plus that order's packing and courier cost. That is a
// different method from the P&L (cash-basis: whatever was bought from suppliers
// in the period), so these figures don't add up to the P&L's net profit — and
// they exclude overheads (the Expenses table). All amounts in paise.
import { prisma } from "@/lib/prisma";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/constants";
import { REVENUE_STATUSES } from "@/lib/finance";
import { gramsOf } from "@/lib/pricing";
import { ORDER_COST_ITEMS_INCLUDE, orderCostOf } from "@/lib/order-cost";
import { customerKey, loadPaidHistory } from "@/lib/repeat-customers";

export type StatusCount = { status: OrderStatus; count: number; value: number };

export type ProductProfit = {
  name: string;
  packs: number;
  grams: number; // 0 when the packs have no weight (merchandise)
  /** Line revenue less its pro-rata share of the order's discounts */
  revenue: number;
  cost: number;
  profit: number;
  /** Profit as a share of revenue; null when there's no revenue */
  marginPct: number | null;
  /** Lines with no wholesale cost on record — profit is overstated by these */
  unknownLines: number;
};

export type StateSales = {
  state: string;
  orders: number;
  revenue: number; // goods, net of discounts
  shippingIncome: number;
  shippingCost: number;
};

export type OrderAnalytics = {
  /** Orders PLACED in the period, by the status they have now */
  byStatus: StatusCount[];
  totalPlaced: number;
  /** Orders that count as sales (REVENUE_STATUSES) — everything below covers these */
  paidOrders: number;
  avgOrderValue: number;
  totalMargin: number;
  avgMargin: number;
  /** Total margin over goods revenue, or null with no revenue */
  marginPct: number | null;
  /** Shipping collected − courier cost, over orders with a courier cost recorded */
  shippingDelta: number;
  ordersMissingCourierCost: number;
  ordersWithUnknownCost: number;
  discountsGiven: number;
  newCustomerOrders: number;
  repeatCustomerOrders: number;
  products: ProductProfit[];
  /** Cost of ₹0 goodies given away, already included in the margins above */
  freebieCost: number;
  states: StateSales[];
};

export async function computeOrderAnalytics(from: Date, to: Date): Promise<OrderAnalytics> {
  const inPeriod = { createdAt: { gte: from, lt: to } };
  const [statusGroups, orders, history] = await Promise.all([
    prisma.order.groupBy({
      by: ["status"],
      _count: { _all: true },
      _sum: { total: true },
      where: inPeriod,
    }),
    prisma.order.findMany({
      where: { ...inPeriod, status: { in: REVENUE_STATUSES } },
      include: { items: ORDER_COST_ITEMS_INCLUDE, user: { select: { phone: true } } },
    }),
    loadPaidHistory(),
  ]);

  const byStatus = ORDER_STATUSES.map((status) => {
    const g = statusGroups.find((s) => s.status === status);
    return { status, count: g?._count._all ?? 0, value: g?._sum.total ?? 0 };
  });

  let totalValue = 0;
  let totalMargin = 0;
  let totalNetRevenue = 0;
  let shippingDelta = 0;
  let ordersMissingCourierCost = 0;
  let ordersWithUnknownCost = 0;
  let discountsGiven = 0;
  let newCustomerOrders = 0;
  let freebieCost = 0;
  const products = new Map<string, ProductProfit>();
  const states = new Map<string, StateSales>();

  for (const order of orders) {
    const cost = orderCostOf(order);
    totalValue += order.total;
    totalMargin += cost.margin;
    totalNetRevenue += cost.netRevenue;
    discountsGiven += order.discount + order.manualDiscount;
    if (cost.unknownLines > 0) ordersWithUnknownCost++;
    if (cost.shippingCostMissing) ordersMissingCourierCost++;
    else shippingDelta += cost.shippingDelta;

    // First paid order ever for this customer → new; anything later → repeat
    const first = history.get(customerKey(order))?.[0];
    if (!first || first.id === order.id) newCustomerOrders++;

    const state = order.shipState.trim() || "Unknown";
    const s = states.get(state) ?? {
      state,
      orders: 0,
      revenue: 0,
      shippingIncome: 0,
      shippingCost: 0,
    };
    s.orders++;
    s.revenue += cost.netRevenue;
    s.shippingIncome += order.shippingFee;
    s.shippingCost += order.shippingCost;
    states.set(state, s);

    // Discounts are agreed per order, so spread them over the lines by value
    const netShare = order.subtotal > 0 ? cost.netRevenue / order.subtotal : 1;
    cost.lines.forEach((line, i) => {
      const item = order.items[i];
      if (item.isFreebie) {
        freebieCost += line.cost ?? 0;
        return;
      }
      const p = products.get(line.productName) ?? {
        name: line.productName,
        packs: 0,
        grams: 0,
        revenue: 0,
        cost: 0,
        profit: 0,
        marginPct: null,
        unknownLines: 0,
      };
      p.packs += line.qty;
      p.grams += (item.variant?.weightGrams ?? gramsOf(line.variantLabel) ?? 0) * line.qty;
      p.revenue += Math.round(line.revenue * netShare);
      if (line.cost == null) p.unknownLines++;
      else p.cost += line.cost;
      products.set(line.productName, p);
    });
  }

  const productRows = [...products.values()]
    .map((p) => {
      const profit = p.revenue - p.cost;
      return { ...p, profit, marginPct: p.revenue > 0 ? (profit / p.revenue) * 100 : null };
    })
    .sort((a, b) => b.profit - a.profit);

  const n = orders.length;
  return {
    byStatus,
    totalPlaced: byStatus.reduce((sum, s) => sum + s.count, 0),
    paidOrders: n,
    avgOrderValue: n ? Math.round(totalValue / n) : 0,
    totalMargin,
    avgMargin: n ? Math.round(totalMargin / n) : 0,
    marginPct: totalNetRevenue > 0 ? (totalMargin / totalNetRevenue) * 100 : null,
    shippingDelta,
    ordersMissingCourierCost,
    ordersWithUnknownCost,
    discountsGiven,
    newCustomerOrders,
    repeatCustomerOrders: n - newCustomerOrders,
    products: productRows,
    freebieCost,
    states: [...states.values()].sort((a, b) => b.revenue - a.revenue),
  };
}
