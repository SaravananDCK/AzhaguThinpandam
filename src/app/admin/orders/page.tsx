import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { OrdersGrid } from "@/components/admin/orders-grid";

export const metadata: Metadata = { title: "Orders" };

export default async function AdminOrdersPage() {
  const orders = await prisma.order.findMany({
    include: { items: true, payment: true },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const rows = orders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    customer: o.shipName,
    phone: o.shipPhone,
    items: o.items.reduce((s, i) => s + i.qty, 0),
    totalRupees: o.total / 100,
    payment: o.payment?.status ?? "—",
    status: o.status,
    createdAt: o.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-2xl font-bold">Orders</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Click a row to manage the order. Use the header filters to slice by
          status or payment.
        </p>
      </div>
      <OrdersGrid rows={rows} />
    </div>
  );
}
