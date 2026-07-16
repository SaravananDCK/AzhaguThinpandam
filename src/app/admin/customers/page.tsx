import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/constants";
import { REVENUE_STATUSES } from "@/lib/finance";
import { CustomersGrid } from "@/components/admin/customers-grid";

export const metadata: Metadata = { title: "Customers" };

export default async function AdminCustomersPage() {
  const customers = await prisma.user.findMany({
    where: { role: ROLES.CUSTOMER },
    include: {
      orders: {
        orderBy: { createdAt: "desc" },
        select: { id: true, orderNumber: true, total: true, status: true, createdAt: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const rows = customers.map((c) => {
    const paidOrders = c.orders.filter((o) => REVENUE_STATUSES.includes(o.status));
    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      joined: c.createdAt.toISOString(),
      orderCount: paidOrders.length,
      totalSpentRupees: paidOrders.reduce((s, o) => s + o.total, 0) / 100,
      lastOrder: c.orders[0]?.createdAt.toISOString() ?? null,
      recentOrders: c.orders.slice(0, 5).map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        totalRupees: o.total / 100,
        status: o.status,
        createdAt: o.createdAt.toISOString(),
      })),
    };
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-2xl font-bold">Customers</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Registered customers (phone-OTP accounts). Expand a row for their recent
          orders — guest orders appear only under Orders.
        </p>
      </div>
      <CustomersGrid rows={rows} />
    </div>
  );
}
