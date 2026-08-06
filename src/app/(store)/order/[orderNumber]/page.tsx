import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CheckCircle2, IndianRupee, MessageCircle, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { formatINR, paiseToRupees } from "@/lib/money";
import { getManualPaymentConfig } from "@/lib/queries";
import { upiPayLink, upiQrSvg, whatsappOrderLink } from "@/lib/upi";
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

  const [order, manual] = await Promise.all([
    prisma.order.findUnique({
      where: { orderNumber: orderNumber.toUpperCase() },
      include: { items: true, payment: true },
    }),
    getManualPaymentConfig(),
  ]);
  if (!order) notFound();

  const statusLabel =
    ORDER_STATUS_LABELS[order.status as OrderStatus] ?? order.status;

  // Awaiting a manual UPI transfer: show how to pay and how to tell us.
  const awaitingUpi = manual.enabled && order.status === "PENDING";
  const upiLink = awaitingUpi
    ? upiPayLink({
        upiId: manual.upiId,
        payeeName: manual.payeeName,
        amountPaise: order.total,
        orderNumber: order.orderNumber,
      })
    : null;
  const waLink = awaitingUpi
    ? whatsappOrderLink({
        phone: manual.whatsappPhone,
        orderNumber: order.orderNumber,
        amountRupees: paiseToRupees(order.total),
      })
    : null;
  const qrSvg = upiLink ? await upiQrSvg(upiLink) : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {placed && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200">
          <CheckCircle2 className="size-6 shrink-0" />
          <div>
            <p className="font-semibold">Thank you! Your order is placed.</p>
            <p className="text-sm opacity-90">
              {awaitingUpi
                ? "It's reserved for you — complete the UPI payment below to confirm it."
                : `A confirmation has been sent to ${order.email}.`}{" "}
              Save your order number:{" "}
              <span className="font-mono font-semibold">{order.orderNumber}</span>
            </p>
          </div>
        </div>
      )}

      {awaitingUpi && (
        <Card className="mb-6 border-amber-300 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/40">
          <CardContent className="space-y-4">
            <p className="flex items-center gap-2 font-semibold">
              <IndianRupee className="size-4" /> Complete your payment
            </p>

            {qrSvg && (
              <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-start sm:gap-5">
                <div className="shrink-0 rounded-xl bg-white p-3 shadow-sm">
                  {/* Inline SVG from qrcode — generated server-side, no request */}
                  <div
                    className="[&>svg]:size-[180px]"
                    dangerouslySetInnerHTML={{ __html: qrSvg }}
                  />
                  <p className="mt-1 text-center text-[11px] font-medium text-neutral-600">
                    Scan to pay {formatINR(order.total)}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground sm:pt-2">
                  Scan with any UPI app — Google Pay, PhonePe, Paytm, or your
                  bank app. The amount and your order number are already filled
                  in, so there&apos;s nothing to type.
                </p>
              </div>
            )}

            <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
              <li>
                Pay <span className="font-semibold text-foreground">{formatINR(order.total)}</span>{" "}
                {manual.upiId ? (
                  <>
                    to UPI ID{" "}
                    <span className="font-mono font-semibold text-foreground">{manual.upiId}</span>
                  </>
                ) : (
                  <>using the payment details we&apos;ll send you on WhatsApp</>
                )}
                .
              </li>
              <li>
                Send us the payment screenshot on WhatsApp, quoting order{" "}
                <span className="font-mono font-semibold text-foreground">{order.orderNumber}</span>.
              </li>
              <li>We confirm your order as soon as the payment shows up.</li>
            </ol>
            <div className="flex flex-wrap gap-2">
              {upiLink && (
                <Button asChild>
                  {/* Opens GPay / PhonePe / Paytm with the amount prefilled */}
                  <a href={upiLink}>
                    <IndianRupee className="size-4" /> Pay {formatINR(order.total)} by UPI
                  </a>
                </Button>
              )}
              {waLink && (
                <Button asChild variant={upiLink ? "outline" : "default"}>
                  <a href={waLink} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="size-4" /> Send screenshot on WhatsApp
                  </a>
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              The UPI button works on a phone with a payment app installed. On a
              computer, pay from your phone using the UPI ID above.
            </p>
          </CardContent>
        </Card>
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
                <p className="text-sm font-medium">
                  {item.isFreebie && "🎁 "}
                  {item.productName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {item.variantLabel} × {item.qty}
                  {packNote(item.variantLabel, item.basePackGrams ?? undefined) &&
                    ` · ${packNote(item.variantLabel, item.basePackGrams ?? undefined)}`}
                </p>
              </div>
              {item.isFreebie ? (
                <p className="text-sm font-semibold text-green-600 dark:text-green-400">FREE</p>
              ) : (
                <p className="text-sm font-medium">{formatINR(item.price * item.qty)}</p>
              )}
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
