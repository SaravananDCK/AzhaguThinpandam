import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Printer } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { OrdersGrid } from "@/components/admin/orders-grid";
import { ORDER_COST_ITEMS_INCLUDE, orderCostOf } from "@/lib/order-cost";

export const metadata: Metadata = { title: "Orders" };

export default async function AdminOrdersPage() {
  const orders = await prisma.order.findMany({
    include: { items: ORDER_COST_ITEMS_INCLUDE, payment: true },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const rows = orders.map((o) => {
    // Today's wholesale cost against what the order earned — the same figure
    // as the cost panel on the order page (see order-cost.ts for caveats).
    const cost = orderCostOf(o);
    return {
      id: o.id,
      orderNumber: o.orderNumber,
      customer: o.shipName,
      phone: o.shipPhone,
      items: o.items.reduce((s, i) => s + i.qty, 0),
      totalRupees: o.total / 100,
      // What the courier charged us (0 = not recorded yet)
      courierCostRupees: o.shippingCost / 100,
      marginRupees: cost.margin / 100,
      marginPct: cost.marginPct == null ? null : Math.round(cost.marginPct * 10) / 10,
      // Lines without a wholesale price, or no courier cost yet: the margin
      // shown is higher than the real one.
      marginIncomplete: cost.unknownLines > 0 || cost.shippingCostMissing,
      payment: o.payment?.status ?? "—",
      status: o.status,
      notes: o.notes ?? "",
      createdAt: o.createdAt.toISOString(),
    };
  });

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
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/orders/slips">
              <Printer className="size-4" /> Shipping slips
            </Link>
          </Button>
          <Button asChild>
            <Link href="/admin/orders/new">
              <Plus className="size-4" /> New order
            </Link>
          </Button>
        </div>
      </div>
      <OrdersGrid rows={rows} />
    </div>
  );
}
