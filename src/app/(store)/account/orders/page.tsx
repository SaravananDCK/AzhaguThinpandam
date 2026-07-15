import Link from "next/link";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/money";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/constants";

export const metadata: Metadata = { title: "My Orders" };

export default async function AccountOrdersPage() {
  const session = await auth();
  const orders = await prisma.order.findMany({
    where: { userId: session!.user.id },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold">My Orders</h1>
      {orders.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          You haven&apos;t placed any orders yet.{" "}
          <Link href="/products" className="text-primary hover:underline">
            Start shopping
          </Link>
        </p>
      ) : (
        <div className="mt-5 space-y-3">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/order/${order.orderNumber}`}
              className="block rounded-xl border p-4 transition-colors hover:bg-accent"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-mono font-medium">{order.orderNumber}</p>
                <Badge variant="outline">
                  {ORDER_STATUS_LABELS[order.status as OrderStatus] ?? order.status}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {order.createdAt.toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}{" "}
                · {order.items.length} item{order.items.length > 1 ? "s" : ""} ·{" "}
                <span className="font-medium text-foreground">{formatINR(order.total)}</span>
              </p>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {order.items.map((i) => `${i.productName} (${i.variantLabel})`).join(", ")}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
