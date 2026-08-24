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
  shippingSpend: number; // courier costs recorded on orders
  packing: number; // internal packing costs on orders
  expenses: ExpenseLine[];
  expensesTotal: number;
  netProfit: number;
};

export async function computePnL(from: Date, to: Date): Promise<PnL> {
  const [orders, purchases, expensesRaw] = await Promise.all([
    prisma.order.findMany({
      where: { status: { in: REVENUE_STATUSES }, createdAt: { gte: from, lt: to } },
      select: {
        subtotal: true,
        discount: true,
        manualDiscount: true,
        shippingFee: true,
        packingCost: true,
        shippingCost: true,
      },
    }),
    prisma.purchase.aggregate({
      _sum: { total: true, transportCharge: true },
      where: { date: { gte: from, lt: to } },
    }),
    prisma.expense.groupBy({
      by: ["category"],
      _sum: { amount: true },
      where: { date: { gte: from, lt: to } },
    }),
  ]);

  const revenue = orders.reduce(
    (s, o) => s + o.subtotal - o.discount - o.manualDiscount,
    0
  );
  const shippingIncome = orders.reduce((s, o) => s + o.shippingFee, 0);
  const packing = orders.reduce((s, o) => s + o.packingCost, 0);
  // What couriers actually charged, as recorded per order. Shown against
  // shippingIncome so an undercharging flat rate is visible.
  const shippingSpend = orders.reduce((s, o) => s + o.shippingCost, 0);
  const cogs = purchases._sum.total ?? 0;
  const expenses = expensesRaw
    .map((e) => ({ category: e.category, amount: e._sum.amount ?? 0 }))
    .sort((a, b) => b.amount - a.amount);
  // Supplier-billed transport, shown as its own operating line. Directly-paid
  // couriers stay in the Expense table under "Transport & Courier" — the two
  // never overlap, so nothing is counted twice.
  const supplierTransport = purchases._sum.transportCharge ?? 0;
  if (supplierTransport > 0) {
    expenses.push({ category: "Transport (supplier invoices)", amount: supplierTransport });
  }
  const expensesTotal = expenses.reduce((s, e) => s + e.amount, 0);

  return {
    from,
    to,
    orderCount: orders.length,
    revenue,
    shippingIncome,
    cogs,
    shippingSpend,
    packing,
    expenses,
    expensesTotal,
    netProfit: revenue + shippingIncome - cogs - packing - shippingSpend - expensesTotal,
  };
}

/** GST component of a GST-INCLUSIVE amount at the given rate (%). Paise in/out. */
export function gstFromInclusive(inclusiveAmount: number, rate: number): number {
  if (!rate || rate <= 0) return 0;
  return Math.round((inclusiveAmount * rate) / (100 + rate));
}

export type GstSummary = {
  outputGst: number; // GST collected on sales (owed to govt)
  inputGst: number; // GST paid on purchases (input tax credit)
  netPayable: number; // outputGst − inputGst (negative = credit carried forward)
  taxableSales: number; // sales ex-GST
  taxablePurchases: number; // purchases ex-GST
};

/**
 * GST position for a period. Both sale prices and purchase totals are
 * GST-inclusive; the tax is backed out with rate/(100+rate). Output GST uses
 * the rate snapshot on each order line; input GST uses each purchase's rate.
 */
export async function computeGst(from: Date, to: Date): Promise<GstSummary> {
  const [orders, purchases] = await Promise.all([
    prisma.order.findMany({
      where: { status: { in: REVENUE_STATUSES }, createdAt: { gte: from, lt: to } },
      select: { items: { select: { price: true, qty: true, gstRate: true } } },
    }),
    prisma.purchase.findMany({
      where: { date: { gte: from, lt: to } },
      select: { total: true, gstRate: true },
    }),
  ]);

  let outputGst = 0;
  let salesInclusive = 0;
  for (const o of orders) {
    for (const i of o.items) {
      const line = i.price * i.qty;
      salesInclusive += line;
      outputGst += gstFromInclusive(line, i.gstRate ?? 0);
    }
  }

  let inputGst = 0;
  let purchasesInclusive = 0;
  for (const p of purchases) {
    purchasesInclusive += p.total;
    inputGst += gstFromInclusive(p.total, p.gstRate);
  }

  return {
    outputGst,
    inputGst,
    netPayable: outputGst - inputGst,
    taxableSales: salesInclusive - outputGst,
    taxablePurchases: purchasesInclusive - inputGst,
  };
}

export type SupplierPayable = {
  id: string;
  name: string;
  purchased: number; // total ever bought (paise)
  paid: number; // total ever paid (paise)
  owed: number; // purchased − paid
};

/**
 * All-time payables per supplier: what we've bought minus what we've paid.
 * Only suppliers linked to purchases via `supplierId` are counted (free-text
 * legacy purchases with no link fall outside the ledger).
 */
/**
 * Per-supplier "bought" and "paid" sums — THE definition of the balance, used
 * by both the payables report and the suppliers API so the two can never
 * disagree. "Bought" is goods + transportCharge: transport the supplier
 * fronted is owed exactly like the goods — it lives outside `total` only for
 * GST's sake (see the Purchase model).
 */
export async function supplierBalanceSums(): Promise<{
  purchasedBy: Map<string | null, number>;
  paidBy: Map<string | null, number>;
}> {
  const [purchaseSums, paymentSums] = await Promise.all([
    prisma.purchase.groupBy({
      by: ["supplierId"],
      _sum: { total: true, transportCharge: true },
      where: { supplierId: { not: null } },
    }),
    prisma.supplierPayment.groupBy({ by: ["supplierId"], _sum: { amount: true } }),
  ]);
  return {
    purchasedBy: new Map(
      purchaseSums.map((p) => [p.supplierId, (p._sum.total ?? 0) + (p._sum.transportCharge ?? 0)])
    ),
    paidBy: new Map(paymentSums.map((p) => [p.supplierId, p._sum.amount ?? 0])),
  };
}

export async function computePayables(): Promise<{
  suppliers: SupplierPayable[];
  totalOwed: number;
}> {
  const [suppliers, { purchasedBy, paidBy }] = await Promise.all([
    prisma.supplier.findMany({ orderBy: { name: "asc" } }),
    supplierBalanceSums(),
  ]);

  const rows = suppliers.map((s) => {
    const purchased = purchasedBy.get(s.id) ?? 0;
    const paid = paidBy.get(s.id) ?? 0;
    return { id: s.id, name: s.name, purchased, paid, owed: purchased - paid };
  });

  return { suppliers: rows, totalOwed: rows.reduce((sum, r) => sum + r.owed, 0) };
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
