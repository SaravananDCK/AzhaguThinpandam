import Link from "next/link";
import { AlertTriangle, IndianRupee, Package, ShoppingCart } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { startOfISTDay } from "@/lib/admin";
import { getSettings } from "@/lib/queries";
import { SETTINGS, ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/constants";
import { formatINR } from "@/lib/money";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const REVENUE_STATUSES = ["PAID", "CONFIRMED", "SHIPPED", "DELIVERED"];

export default async function AdminDashboard() {
  const settings = await getSettings();
  const lowStockThreshold = parseInt(settings[SETTINGS.LOW_STOCK_THRESHOLD], 10) || 5;

  const [todayAgg, weekAgg, needAction, recentOrders, lowStock] = await Promise.all([
    prisma.order.aggregate({
      _sum: { total: true },
      _count: true,
      where: { status: { in: REVENUE_STATUSES }, createdAt: { gte: startOfISTDay() } },
    }),
    prisma.order.aggregate({
      _sum: { total: true },
      _count: true,
      where: { status: { in: REVENUE_STATUSES }, createdAt: { gte: startOfISTDay(6) } },
    }),
    prisma.order.count({ where: { status: { in: ["PAID", "CONFIRMED"] } } }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { items: true },
    }),
    prisma.productVariant.findMany({
      where: { isActive: true, stock: { lte: lowStockThreshold }, product: { isActive: true } },
      include: { product: true },
      orderBy: { stock: "asc" },
      take: 10,
    }),
  ]);

  const stats = [
    {
      label: "Today's revenue",
      value: formatINR(todayAgg._sum.total ?? 0),
      sub: `${todayAgg._count} paid order${todayAgg._count === 1 ? "" : "s"}`,
      icon: IndianRupee,
    },
    {
      label: "Last 7 days",
      value: formatINR(weekAgg._sum.total ?? 0),
      sub: `${weekAgg._count} paid order${weekAgg._count === 1 ? "" : "s"}`,
      icon: ShoppingCart,
    },
    {
      label: "Needs action",
      value: String(needAction),
      sub: "paid/confirmed orders to process",
      icon: Package,
    },
    {
      label: "Low stock",
      value: String(lowStock.length),
      sub: `variants at ≤ ${lowStockThreshold} units`,
      icon: AlertTriangle,
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="mt-1 text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.sub}</p>
              </div>
              <s.icon className="size-5 text-primary" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="font-semibold">Recent orders</p>
              <Link href="/admin/orders" className="text-sm text-primary hover:underline">
                View all
              </Link>
            </div>
            <div className="mt-3 space-y-2">
              {recentOrders.length === 0 && (
                <p className="text-sm text-muted-foreground">No orders yet.</p>
              )}
              {recentOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/admin/orders/${order.id}`}
                  className="flex items-center justify-between rounded-lg border p-2.5 text-sm transition-colors hover:bg-accent"
                >
                  <div>
                    <span className="font-mono font-medium">{order.orderNumber}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {order.shipName} · {order.items.length} item
                      {order.items.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{formatINR(order.total)}</span>
                    <Badge variant="outline">
                      {ORDER_STATUS_LABELS[order.status as OrderStatus] ?? order.status}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <p className="font-semibold">Low stock</p>
            <div className="mt-3 space-y-2">
              {lowStock.length === 0 && (
                <p className="text-sm text-muted-foreground">All stocked up 🎉</p>
              )}
              {lowStock.map((v) => (
                <Link
                  key={v.id}
                  href={`/admin/products/${v.productId}`}
                  className="flex items-center justify-between rounded-lg border p-2.5 text-sm transition-colors hover:bg-accent"
                >
                  <span className="min-w-0 truncate">
                    {v.product.name} <span className="text-muted-foreground">({v.label})</span>
                  </span>
                  <Badge variant={v.stock === 0 ? "destructive" : "secondary"}>
                    {v.stock} left
                  </Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
