// P&L and financial-summary math for the admin accounting module.
// All amounts in paise. "Revenue" is product sales net of bundle discounts;
// shipping collected is shown separately; COGS = supplier purchases in the
// period (cash-basis, practical for a small business).
import { prisma } from "@/lib/prisma";

export const REVENUE_STATUSES = ["PAID", "CONFIRMED", "SHIPPED", "DELIVERED"];

export type ExpenseLine = { category: string; amount: number };

export type PnL = {
  from: Date;
  to: Date;
  orderCount: number;
  revenue: number; // subtotal - discount
  shippingIncome: number;
  cogs: number; // purchases in period
  packing: number; // internal packing costs on orders
  expenses: ExpenseLine[];
  expensesTotal: number;
  netProfit: number;
};

export async function computePnL(from: Date, to: Date): Promise<PnL> {
  const [orders, purchases, expensesRaw] = await Promise.all([
    prisma.order.findMany({
      where: { status: { in: REVENUE_STATUSES }, createdAt: { gte: from, lt: to } },
      select: { subtotal: true, discount: true, shippingFee: true, packingCost: true },
    }),
    prisma.purchase.aggregate({
      _sum: { total: true },
      where: { date: { gte: from, lt: to } },
    }),
    prisma.expense.groupBy({
      by: ["category"],
      _sum: { amount: true },
      where: { date: { gte: from, lt: to } },
    }),
  ]);

  const revenue = orders.reduce((s, o) => s + o.subtotal - o.discount, 0);
  const shippingIncome = orders.reduce((s, o) => s + o.shippingFee, 0);
  const packing = orders.reduce((s, o) => s + o.packingCost, 0);
  const cogs = purchases._sum.total ?? 0;
  const expenses = expensesRaw
    .map((e) => ({ category: e.category, amount: e._sum.amount ?? 0 }))
    .sort((a, b) => b.amount - a.amount);
  const expensesTotal = expenses.reduce((s, e) => s + e.amount, 0);

  return {
    from,
    to,
    orderCount: orders.length,
    revenue,
    shippingIncome,
    cogs,
    packing,
    expenses,
    expensesTotal,
    netProfit: revenue + shippingIncome - cogs - packing - expensesTotal,
  };
}

const IST_OFFSET_MS = 5.5 * 3600 * 1000;

/** UTC instant at which the given IST month begins. monthOffset 0 = current. */
export function startOfISTMonth(monthOffset = 0): Date {
  const istNow = new Date(Date.now() + IST_OFFSET_MS);
  return new Date(
    Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth() + monthOffset, 1) - IST_OFFSET_MS
  );
}

/** Parses "2026-07" into that IST month's [start, end); null if invalid. */
export function parseMonthParam(value: string | undefined): { from: Date; to: Date } | null {
  if (!value) return null;
  const m = value.match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  const year = parseInt(m[1], 10);
  const month = parseInt(m[2], 10) - 1;
  if (month < 0 || month > 11) return null;
  return {
    from: new Date(Date.UTC(year, month, 1) - IST_OFFSET_MS),
    to: new Date(Date.UTC(year, month + 1, 1) - IST_OFFSET_MS),
  };
}

export function monthLabel(date: Date): string {
  return new Date(date.getTime() + IST_OFFSET_MS).toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function monthParamOf(date: Date): string {
  const ist = new Date(date.getTime() + IST_OFFSET_MS);
  return `${ist.getUTCFullYear()}-${String(ist.getUTCMonth() + 1).padStart(2, "0")}`;
}
