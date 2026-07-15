import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatINR } from "@/lib/money";
import { ORDER_STATUSES, ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Orders" };

type Props = { searchParams: Promise<{ status?: string }> };

export default async function AdminOrdersPage({ searchParams }: Props) {
  const { status } = await searchParams;
  const filter = ORDER_STATUSES.includes(status as OrderStatus)
    ? (status as OrderStatus)
    : undefined;

  const [orders, counts] = await Promise.all([
    prisma.order.findMany({
      where: filter ? { status: filter } : undefined,
      include: { items: true, payment: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.order.groupBy({ by: ["status"], _count: true }),
  ]);
  const countByStatus = Object.fromEntries(counts.map((c) => [c.status, c._count]));

  return (
    <div className="space-y-5">
      <h1 className="font-heading text-2xl font-bold">Orders</h1>

      <div className="flex flex-wrap gap-2">
        <Link href="/admin/orders">
          <Badge variant={!filter ? "default" : "outline"} className="px-3 py-1.5">
            All ({orders.length && !filter ? orders.length : counts.reduce((s, c) => s + c._count, 0)})
          </Badge>
        </Link>
        {ORDER_STATUSES.map((s) => (
          <Link key={s} href={`/admin/orders?status=${s}`}>
            <Badge
              variant={filter === s ? "default" : "outline"}
              className={cn("px-3 py-1.5", filter !== s && "hover:bg-accent")}
            >
              {ORDER_STATUS_LABELS[s]} ({countByStatus[s] ?? 0})
            </Badge>
          </Link>
        ))}
      </div>

      {orders.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">No orders here yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="font-mono font-medium text-primary hover:underline"
                    >
                      {order.orderNumber}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{order.shipName}</p>
                    <p className="text-xs text-muted-foreground">{order.shipPhone}</p>
                  </TableCell>
                  <TableCell>{order.items.reduce((s, i) => s + i.qty, 0)}</TableCell>
                  <TableCell className="font-medium">{formatINR(order.total)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        order.payment?.status === "CAPTURED"
                          ? "secondary"
                          : order.payment?.status === "FAILED"
                            ? "destructive"
                            : "outline"
                      }
                    >
                      {order.payment?.status ?? "—"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {ORDER_STATUS_LABELS[order.status as OrderStatus] ?? order.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {order.createdAt.toLocaleString("en-IN", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
