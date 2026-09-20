import { prisma } from "@/lib/prisma";
import { REVENUE_STATUSES } from "@/lib/finance";
import { normalizePhone } from "@/lib/otp";

// "Which order is this for the customer?" — 1st, 2nd, 3rd — so repeat buyers
// stand out in the admin. Computed at read time from the order history, never
// stored, so cancellations and merged customers can't leave a stale number.
//
// A customer is whoever the Customers page says they are: the account's
// normalized phone (guest orders with the same number merge in), or the
// shipping phone for a guest. Only paid orders (REVENUE_STATUSES) consume a
// number — a failed first attempt doesn't make the real one the "2nd".

type KeyedOrder = {
  userId: string | null;
  shipPhone: string;
  user?: { phone: string | null } | null;
};

export function customerKey(o: KeyedOrder): string {
  if (o.userId) {
    const phone = o.user?.phone ? normalizePhone(o.user.phone) : null;
    return phone ?? `user:${o.userId}`;
  }
  return normalizePhone(o.shipPhone) ?? o.shipPhone;
}

type PaidOrder = { id: string; createdAt: Date; total: number };
/** Paid orders per customer key, oldest first */
export type PaidHistory = Map<string, PaidOrder[]>;

export function groupPaidHistory(
  orders: (KeyedOrder & PaidOrder)[]
): PaidHistory {
  const history: PaidHistory = new Map();
  for (const o of orders) {
    const key = customerKey(o);
    const list = history.get(key);
    const entry = { id: o.id, createdAt: o.createdAt, total: o.total };
    if (list) list.push(entry);
    else history.set(key, [entry]);
  }
  for (const list of history.values()) {
    list.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || (a.id < b.id ? -1 : 1));
  }
  return history;
}

/**
 * Every paid order ever, grouped by customer. All-time on purpose: the Orders
 * list only loads the newest 500, and a regular's first order may be older.
 */
export async function loadPaidHistory(): Promise<PaidHistory> {
  const orders = await prisma.order.findMany({
    where: { status: { in: REVENUE_STATUSES } },
    select: {
      id: true,
      userId: true,
      shipPhone: true,
      createdAt: true,
      total: true,
      user: { select: { phone: true } },
    },
  });
  return groupPaidHistory(orders);
}

/**
 * Position of an order among its customer's paid orders. An unpaid order gets
 * the position it would take if it were paid, so a pending order from a
 * three-time customer still reads "4th".
 */
export function ordinalOf(
  history: PaidHistory,
  order: KeyedOrder & { id: string; createdAt: Date }
): number {
  const t = order.createdAt.getTime();
  const earlier = (history.get(customerKey(order)) ?? []).filter((p) => {
    if (p.id === order.id) return false;
    const pt = p.createdAt.getTime();
    return pt < t || (pt === t && p.id < order.id);
  });
  return earlier.length + 1;
}

/** Totals behind the ordinal, for the order page header. Paise. */
export function historyFor(
  history: PaidHistory,
  order: KeyedOrder
): { paidOrders: number; lifetimeSpend: number } {
  const list = history.get(customerKey(order)) ?? [];
  return { paidOrders: list.length, lifetimeSpend: list.reduce((s, p) => s + p.total, 0) };
}
