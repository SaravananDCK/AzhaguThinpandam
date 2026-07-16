import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/constants";
import { REVENUE_STATUSES } from "@/lib/finance";
import { normalizePhone } from "@/lib/otp";
import { CustomersGrid, type CustomerRow } from "@/components/admin/customers-grid";

export const metadata: Metadata = { title: "Customers" };

type SimpleOrder = {
  id: string;
  orderNumber: string;
  total: number;
  status: string;
  createdAt: Date;
};

function withStats(
  base: Omit<CustomerRow, "orderCount" | "totalSpentRupees" | "lastOrder" | "recentOrders">,
  orders: SimpleOrder[]
): CustomerRow {
  const sorted = [...orders].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const paid = sorted.filter((o) => REVENUE_STATUSES.includes(o.status));
  return {
    ...base,
    orderCount: paid.length,
    totalSpentRupees: paid.reduce((s, o) => s + o.total, 0) / 100,
    lastOrder: sorted[0]?.createdAt.toISOString() ?? null,
    recentOrders: sorted.slice(0, 5).map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      totalRupees: o.total / 100,
      status: o.status,
      createdAt: o.createdAt.toISOString(),
    })),
  };
}

export default async function AdminCustomersPage() {
  const [customers, guestOrders] = await Promise.all([
    prisma.user.findMany({
      where: { role: ROLES.CUSTOMER },
      include: {
        orders: {
          select: { id: true, orderNumber: true, total: true, status: true, createdAt: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.order.findMany({
      where: { userId: null },
      select: {
        id: true,
        orderNumber: true,
        total: true,
        status: true,
        createdAt: true,
        shipName: true,
        shipPhone: true,
        email: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Registered customers, keyed by normalized phone so guest orders placed
  // with the same number merge into their profile
  const byPhone = new Map<string, { user: (typeof customers)[number]; extra: SimpleOrder[] }>();
  for (const c of customers) {
    const key = c.phone ? normalizePhone(c.phone) : null;
    if (key) byPhone.set(key, { user: c, extra: [] });
  }

  // Guest orders: attach to a registered customer with the same phone, or
  // group into synthetic guest rows per phone number
  const guestGroups = new Map<
    string,
    { name: string; phone: string; email: string; orders: SimpleOrder[] }
  >();
  for (const o of guestOrders) {
    const key = normalizePhone(o.shipPhone) ?? o.shipPhone;
    const registered = byPhone.get(key);
    if (registered) {
      registered.extra.push(o);
      continue;
    }
    const group = guestGroups.get(key);
    if (group) {
      group.orders.push(o);
    } else {
      // Orders are newest-first, so the first sighting carries the latest details
      guestGroups.set(key, { name: o.shipName, phone: key, email: o.email, orders: [o] });
    }
  }

  const rows: CustomerRow[] = [
    ...customers.map((c) => {
      const key = c.phone ? normalizePhone(c.phone) : null;
      const extra = (key && byPhone.get(key)?.extra) || [];
      return withStats(
        {
          id: c.id,
          type: "REGISTERED",
          name: c.name,
          phone: c.phone,
          email: c.email,
          joined: c.createdAt.toISOString(),
        },
        [...c.orders, ...extra]
      );
    }),
    ...[...guestGroups.values()].map((g) =>
      withStats(
        {
          id: `guest-${g.phone}`,
          type: "GUEST",
          name: g.name,
          phone: g.phone,
          email: g.email,
          joined: g.orders[g.orders.length - 1].createdAt.toISOString(),
        },
        g.orders
      )
    ),
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-2xl font-bold">Customers</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Registered accounts and guest buyers (grouped by phone number) in one
          view. Guest orders placed with a registered customer&apos;s number count
          toward their profile. Expand a row for recent orders.
        </p>
      </div>
      <CustomersGrid rows={rows} />
    </div>
  );
}
