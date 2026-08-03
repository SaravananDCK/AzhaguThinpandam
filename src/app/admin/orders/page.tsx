import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold">Orders</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Click a row to manage the order. Use the header filters to slice by
            status or payment.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/orders/new">
            <Plus className="size-4" /> New order
          </Link>
        </Button>
      </div>
      <OrdersGrid rows={rows} />
    </div>
  );
}
