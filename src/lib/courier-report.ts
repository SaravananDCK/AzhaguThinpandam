import { prisma } from "@/lib/prisma";
import { totalKg } from "@/lib/box";
import { REVENUE_STATUSES } from "@/lib/finance";

// Parcels sent in a date range, laid out like the courier's monthly statement
// (date, destination, weight, amount) so the two can be checked line by line.
// We don't record consignment numbers; date + city + weight is enough to pair
// a statement line with an order.

const IST_OFFSET_MS = 5.5 * 3600 * 1000;

/** "2026-09-01" → the UTC instant that IST day starts; null if invalid. */
export function parseISTDay(value: string | undefined): Date | null {
  const m = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]) - IST_OFFSET_MS);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** The IST calendar day of an instant, as "YYYY-MM-DD". */
export function istDay(d: Date): string {
  return new Date(d.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

export type CourierRow = {
  id: string;
  orderNumber: string;
  customer: string;
  city: string;
  state: string;
  pincode: string;
  /** Day it went to the courier — or the paid day when that wasn't recorded */
  date: Date;
  dateIsGuess: boolean;
  /** Packed goods, goodies included; the courier's weight adds packaging */
  weightKg: number;
  /** Delivery charge the customer paid us, paise */
  charged: number;
  /** What the courier billed us, paise (0 = not entered yet) */
  courierCost: number;
  preorder: boolean;
  status: string;
};

export async function buildCourierReport(from: Date, to: Date) {
  const orders = await prisma.order.findMany({
    where: {
      status: { in: REVENUE_STATUSES },
      OR: [
        { shippedAt: { gte: from, lt: to } },
        { shippedAt: null, invoicedAt: { gte: from, lt: to } },
        { shippedAt: null, invoicedAt: null, createdAt: { gte: from, lt: to } },
      ],
    },
    include: { items: { select: { variantLabel: true, qty: true } } },
  });

  const rows: CourierRow[] = orders
    .map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      customer: o.shipName,
      city: o.shipCity,
      state: o.shipState,
      pincode: o.shipPincode,
      date: o.shippedAt ?? o.invoicedAt ?? o.createdAt,
      dateIsGuess: !o.shippedAt,
      weightKg: totalKg(o.items.map((i) => ({ label: i.variantLabel, qty: i.qty }))),
      charged: o.shippingFee,
      courierCost: o.shippingCost,
      preorder: o.preorder,
      status: o.status,
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime() || a.city.localeCompare(b.city));

  return {
    rows,
    totals: {
      parcels: rows.length,
      weightKg: rows.reduce((s, r) => s + r.weightKg, 0),
      charged: rows.reduce((s, r) => s + r.charged, 0),
      courierCost: rows.reduce((s, r) => s + r.courierCost, 0),
      missing: rows.filter((r) => r.courierCost === 0).length,
      // Delivery profit only over parcels whose bill is in, or every missing
      // entry would read as pure profit
      chargedBilled: rows.filter((r) => r.courierCost > 0).reduce((s, r) => s + r.charged, 0),
    },
  };
}
