import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Printer } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { computeOrderCost } from "@/lib/order-cost";
import { formatKg, totalKg } from "@/lib/box";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { formatINR, paiseToRupees } from "@/lib/money";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/constants";
import { StatusButtons } from "./status-buttons";
import { DeleteOrder } from "./delete-order";
import { EditOrderDetails } from "./edit-details";
import { EditOrderItems } from "./edit-items";
import { OrderDiscount } from "./order-discount";
import { CostPanel } from "./cost-panel";
import { updatePackingCost, updateShippingCost } from "../actions";

export const metadata: Metadata = { title: "Order Detail" };

type Props = { params: Promise<{ id: string }> };

export default async function AdminOrderDetailPage({ params }: Props) {
  const { id } = await params;
  const [order, variants] = await Promise.all([
    prisma.order.findUnique({
      where: { id },
      include: { items: true, payment: true, user: true },
    }),
    prisma.productVariant.findMany({
      where: { isActive: true, product: { isActive: true } },
      include: { product: { select: { name: true, madeToOrder: true } } },
      orderBy: [{ product: { name: "asc" } }, { label: "asc" }],
    }),
  ]);
  if (!order) notFound();

  const cost = await computeOrderCost(order.id);
  // Same weight the shipping and bundle-discount rules use
  const orderKg = totalKg(order.items.map((i) => ({ label: i.variantLabel, qty: i.qty })));

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
        <div className="ml-auto flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/admin/orders/${order.id}/print`}>
              <Printer className="size-4" /> Print
            </Link>
          </Button>
          <Badge variant="outline" className="px-3 py-1">
            {ORDER_STATUS_LABELS[order.status as OrderStatus] ?? order.status}
          </Badge>
        </div>
      </div>

      <Card>
        <CardContent>
          <p className="mb-3 font-semibold">Update status</p>
          <StatusButtons orderId={order.id} currentStatus={order.status as OrderStatus} />
          {/* Only these two are safe to remove — no stock moved, no revenue
              counted. Anything paid must be cancelled first. */}
          {(order.status === "PENDING" || order.status === "CANCELLED") && (
            <div className="mt-4 border-t pt-3">
              <DeleteOrder
                orderId={order.id}
                orderNumber={order.orderNumber}
                customer={order.shipName}
                total={order.total}
              />
            </div>
          )}
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
                <p className="font-medium">
                  {item.productName}
                  {item.isFreebie && (
                    <span className="ml-1.5 rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-950/60 dark:text-green-400">
                      GOODIE
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {item.variantLabel} × {item.qty} @ {formatINR(item.price)}
                </p>
              </div>
              {item.isFreebie ? (
                <p className="font-semibold text-green-600 dark:text-green-400">FREE</p>
              ) : (
                <p className="font-medium">{formatINR(item.price * item.qty)}</p>
              )}
            </div>
          ))}
          {order.status === "PENDING" && (
            <EditOrderItems
              orderId={order.id}
              couponCode={order.couponCode}
              // Goodie lines are excluded: repricing regenerates them for the
              // new weight (seeding them here would re-price them at full cost
              // or trip the duplicate-item check).
              currentItems={order.items
                .filter((i) => i.variantId && !i.isFreebie)
                .map((i) => ({ variantId: i.variantId!, qty: i.qty }))}
              variants={variants.map((v) => ({
                id: v.id,
                label: `${v.product.name} — ${v.label}`,
                price: v.price,
                stock: v.stock,
                madeToOrder: v.product.madeToOrder,
              }))}
            />
          )}
          {order.status === "PENDING" && (
            <OrderDiscount
              orderId={order.id}
              manualDiscount={order.manualDiscount}
              discountNote={order.discountNote}
              maxDiscount={Math.max(0, order.subtotal - order.discount)}
            />
          )}
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
            {order.manualDiscount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Discount{order.discountNote ? ` (${order.discountNote})` : ""}
                </span>
                <span className="font-medium text-green-600 dark:text-green-400">
                  −{formatINR(order.manualDiscount)}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shipping</span>
              <span>{order.shippingFee === 0 ? "FREE" : formatINR(order.shippingFee)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total weight</span>
              <span>{formatKg(orderKg)}</span>
            </div>
            {cost && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Goods cost <span className="text-xs">(internal)</span>
                </span>
                <span>
                  {formatINR(cost.goodsCost)}
                  {cost.unknownLines > 0 && (
                    <span className="ml-1 text-xs text-amber-700 dark:text-amber-500">
                      + {cost.unknownLines} unpriced
                    </span>
                  )}
                </span>
              </div>
            )}
            <form
              action={updateShippingCost.bind(null, order.id)}
              className="flex items-center justify-between gap-2"
            >
              <span className="text-muted-foreground">
                Courier cost <span className="text-xs">(internal)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Input
                  name="shippingCost"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={paiseToRupees(order.shippingCost)}
                  className="h-7 w-24 text-right text-sm"
                />
                <Button type="submit" variant="outline" size="sm" className="h-7">
                  Save
                </Button>
              </span>
            </form>
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

      {cost && <CostPanel cost={cost} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="space-y-3 text-sm">
            <p className="font-semibold">Customer &amp; delivery</p>
            <div className="text-muted-foreground">
              <p className="font-medium text-foreground">{order.shipName}</p>
              <p>{order.shipLine1}</p>
              {order.shipLine2 && <p>{order.shipLine2}</p>}
              <p>
                {order.shipCity}, {order.shipState} — {order.shipPincode}
              </p>
              <p className="mt-1.5">📞 {order.shipPhone}</p>
              <p>✉️ {order.email || <span className="italic">no email on file</span>}</p>
              {order.notes && (
                <p className="mt-2 rounded-lg bg-secondary p-2 text-xs">
                  <span className="font-medium">Note:</span> {order.notes}
                </p>
              )}
            </div>
            <EditOrderDetails
              order={{
                id: order.id,
                shipName: order.shipName,
                shipPhone: order.shipPhone,
                shipLine1: order.shipLine1,
                shipLine2: order.shipLine2 ?? "",
                shipCity: order.shipCity,
                shipState: order.shipState,
                shipPincode: order.shipPincode,
                email: order.email,
                notes: order.notes ?? "",
              }}
            />
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
