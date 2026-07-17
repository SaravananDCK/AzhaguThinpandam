import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CheckCircle2, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { formatINR } from "@/lib/money";
import { packNote } from "@/lib/pack";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/constants";

export const metadata: Metadata = { title: "Order Details" };

type Props = {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<{ placed?: string }>;
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "outline",
  PAID: "default",
  CONFIRMED: "default",
  SHIPPED: "default",
  DELIVERED: "secondary",
  CANCELLED: "destructive",
};

export default async function OrderPage({ params, searchParams }: Props) {
  const { orderNumber } = await params;
  const { placed } = await searchParams;

  const order = await prisma.order.findUnique({
    where: { orderNumber: orderNumber.toUpperCase() },
    include: { items: true, payment: true },
  });
  if (!order) notFound();

  const statusLabel =
    ORDER_STATUS_LABELS[order.status as OrderStatus] ?? order.status;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {placed && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200">
          <CheckCircle2 className="size-6 shrink-0" />
          <div>
            <p className="font-semibold">Thank you! Your order is placed.</p>
            <p className="text-sm opacity-90">
              A confirmation has been sent to {order.email}. Save your order number:{" "}
              <span className="font-mono font-semibold">{order.orderNumber}</span>
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold">
            Order <span className="font-mono">{order.orderNumber}</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Placed on{" "}
            {order.createdAt.toLocaleDateString("en-IN", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <Badge variant={STATUS_VARIANT[order.status] ?? "outline"} className="px-3 py-1 text-sm">
          {statusLabel}
        </Badge>
      </div>

      <Card className="mt-6">
        <CardContent className="space-y-4">
          <p className="flex items-center gap-2 font-semibold">
            <Package className="size-4" /> Items
          </p>
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center gap-3">
              <div className="size-14 shrink-0 overflow-hidden rounded-lg border bg-muted">
                {item.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image} alt="" className="size-full object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{item.productName}</p>
                <p className="text-xs text-muted-foreground">
                  {item.variantLabel} × {item.qty}
                  {packNote(item.variantLabel, item.basePackGrams ?? undefined) &&
                    ` · ${packNote(item.variantLabel, item.basePackGrams ?? undefined)}`}
                </p>
              </div>
              <p className="text-sm font-medium">{formatINR(item.price * item.qty)}</p>
            </div>
          ))}
          <Separator />
          <div className="space-y-1.5 text-sm">
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
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>{formatINR(order.total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent>
            <p className="font-semibold">Delivery Address</p>
            <div className="mt-2 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">{order.shipName}</p>
              <p>{order.shipLine1}</p>
              {order.shipLine2 && <p>{order.shipLine2}</p>}
              <p>
                {order.shipCity}, {order.shipState} — {order.shipPincode}
              </p>
              <p className="mt-1">Phone: {order.shipPhone}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="font-semibold">Payment</p>
            <div className="mt-2 space-y-1 text-sm text-muted-foreground">
              <p>
                Status:{" "}
                <span className="font-medium text-foreground">
                  {order.payment?.status === "CAPTURED"
                    ? "Paid"
                    : order.payment?.status === "FAILED"
                      ? "Failed"
                      : "Pending"}
                </span>
              </p>
              {order.payment?.method && <p>Method: {order.payment.method}</p>}
              {order.payment?.razorpayPaymentId && (
                <p className="break-all">Ref: {order.payment.razorpayPaymentId}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 flex justify-center">
        <Button asChild variant="outline">
          <Link href="/products">Continue shopping</Link>
        </Button>
      </div>
    </div>
  );
}
