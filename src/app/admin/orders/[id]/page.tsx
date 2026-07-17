import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { formatINR, paiseToRupees } from "@/lib/money";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/constants";
import { StatusButtons } from "./status-buttons";
import { updatePackingCost } from "../actions";

export const metadata: Metadata = { title: "Order Detail" };

type Props = { params: Promise<{ id: string }> };

export default async function AdminOrderDetailPage({ params }: Props) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true, payment: true, user: true },
  });
  if (!order) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/admin/orders" aria-label="Back to orders">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="font-heading text-xl font-bold">
            Order <span className="font-mono">{order.orderNumber}</span>
          </h1>
          <p className="text-xs text-muted-foreground">
            {order.createdAt.toLocaleString("en-IN")} ·{" "}
            {order.user
              ? `Account: ${order.user.phone ?? order.user.email ?? order.user.id}`
              : "Guest checkout"}
          </p>
        </div>
        <Badge variant="outline" className="ml-auto px-3 py-1">
          {ORDER_STATUS_LABELS[order.status as OrderStatus] ?? order.status}
        </Badge>
      </div>

      <Card>
        <CardContent>
          <p className="mb-3 font-semibold">Update status</p>
          <StatusButtons orderId={order.id} currentStatus={order.status as OrderStatus} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3">
          <p className="font-semibold">Items</p>
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 text-sm">
              <div className="size-12 shrink-0 overflow-hidden rounded-lg border bg-muted">
                {item.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image} alt="" className="size-full object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{item.productName}</p>
                <p className="text-xs text-muted-foreground">
                  {item.variantLabel} × {item.qty} @ {formatINR(item.price)}
                </p>
              </div>
              <p className="font-medium">{formatINR(item.price * item.qty)}</p>
            </div>
          ))}
          <Separator />
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatINR(order.subtotal)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {order.couponCode ? `Coupon (${order.couponCode})` : "Bundle discount"}
                </span>
                <span className="font-medium text-green-600 dark:text-green-400">
                  −{formatINR(order.discount)}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shipping</span>
              <span>{order.shippingFee === 0 ? "FREE" : formatINR(order.shippingFee)}</span>
            </div>
            <form
              action={updatePackingCost.bind(null, order.id)}
              className="flex items-center justify-between gap-2"
            >
              <span className="text-muted-foreground">Packing cost (internal)</span>
              <span className="flex items-center gap-1.5">
                <Input
                  name="packingCost"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={paiseToRupees(order.packingCost)}
                  className="h-7 w-24 text-right text-sm"
                />
                <Button type="submit" variant="outline" size="sm" className="h-7">
                  Save
                </Button>
              </span>
            </form>
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>{formatINR(order.total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="text-sm">
            <p className="font-semibold">Customer & delivery</p>
            <div className="mt-2 text-muted-foreground">
              <p className="font-medium text-foreground">{order.shipName}</p>
              <p>{order.shipLine1}</p>
              {order.shipLine2 && <p>{order.shipLine2}</p>}
              <p>
                {order.shipCity}, {order.shipState} — {order.shipPincode}
              </p>
              <p className="mt-1.5">📞 {order.shipPhone}</p>
              <p>✉️ {order.email}</p>
              {order.notes && (
                <p className="mt-2 rounded-lg bg-secondary p-2 text-xs">
                  <span className="font-medium">Note:</span> {order.notes}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-sm">
            <p className="font-semibold">Payment</p>
            <div className="mt-2 space-y-1 text-muted-foreground">
              <p>
                Status:{" "}
                <Badge
                  variant={
                    order.payment?.status === "CAPTURED"
                      ? "secondary"
                      : order.payment?.status === "FAILED"
                        ? "destructive"
                        : "outline"
                  }
                >
                  {order.payment?.status ?? "No payment record"}
                </Badge>
              </p>
              {order.payment?.method && <p>Method: {order.payment.method}</p>}
              {order.payment?.razorpayOrderId && (
                <p className="break-all text-xs">RZP Order: {order.payment.razorpayOrderId}</p>
              )}
              {order.payment?.razorpayPaymentId && (
                <p className="break-all text-xs">RZP Payment: {order.payment.razorpayPaymentId}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
