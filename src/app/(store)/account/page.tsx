import Link from "next/link";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/money";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/constants";

export const metadata: Metadata = { title: "My Account" };

export default async function AccountPage() {
  const session = await auth();
  const [user, recentOrders] = await Promise.all([
    prisma.user.findUnique({ where: { id: session!.user.id } }),
    prisma.order.findMany({
      where: { userId: session!.user.id },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">My Account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your profile, orders and addresses.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-1 text-sm">
          <p className="font-semibold">Profile</p>
          {user?.phone && (
            <p>
              <span className="text-muted-foreground">Mobile:</span> {user.phone}
            </p>
          )}
          {user?.name && (
            <p>
              <span className="text-muted-foreground">Name:</span> {user.name}
            </p>
          )}
          {user?.email && (
            <p>
              <span className="text-muted-foreground">Email:</span> {user.email}
            </p>
          )}
        </CardContent>
      </Card>

      <div>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Recent orders</h2>
          <Button asChild variant="ghost" size="sm">
            <Link href="/account/orders">View all</Link>
          </Button>
        </div>
        {recentOrders.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No orders yet.{" "}
            <Link href="/products" className="text-primary hover:underline">
              Start shopping
            </Link>
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {recentOrders.map((order) => (
              <Link
                key={order.id}
                href={`/order/${order.orderNumber}`}
                className="flex items-center justify-between rounded-lg border p-3 text-sm transition-colors hover:bg-accent"
              >
                <div>
                  <p className="font-mono font-medium">{order.orderNumber}</p>
                  <p className="text-xs text-muted-foreground">
                    {order.createdAt.toLocaleDateString("en-IN")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium">{formatINR(order.total)}</span>
                  <Badge variant="outline">
                    {ORDER_STATUS_LABELS[order.status as OrderStatus] ?? order.status}
                  </Badge>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
