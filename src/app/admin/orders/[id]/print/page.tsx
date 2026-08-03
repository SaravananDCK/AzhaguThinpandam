import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/queries";
import { SETTINGS, ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/constants";
import { formatINR } from "@/lib/money";
import { gstFromInclusive } from "@/lib/finance";
import { packNote } from "@/lib/pack";
import { Button } from "@/components/ui/button";
import { PrintButton } from "@/components/admin/print-button";

export const metadata: Metadata = { title: "Print order" };

type Props = { params: Promise<{ id: string }> };

export default async function OrderPrintPage({ params }: Props) {
  const { id } = await params;
  const [order, settings] = await Promise.all([
    prisma.order.findUnique({ where: { id }, include: { items: true, payment: true } }),
    getSettings(),
  ]);
  if (!order) notFound();

  const storeName = settings[SETTINGS.STORE_NAME];
  const storeAddress = settings[SETTINGS.STORE_ADDRESS];
  const storePhone = settings[SETTINGS.STORE_PHONE];
  const storeEmail = settings[SETTINGS.STORE_EMAIL];

  // Prices are GST-inclusive, so the tax is backed out of each line at the rate
  // snapshotted on it when the order was placed.
  const gstByRate = new Map<number, { taxable: number; gst: number }>();
  for (const item of order.items) {
    const rate = item.gstRate ?? 0;
    if (!rate) continue;
    const gross = item.price * item.qty;
    const gst = gstFromInclusive(gross, rate);
    const entry = gstByRate.get(rate) ?? { taxable: 0, gst: 0 };
    entry.taxable += gross - gst;
    entry.gst += gst;
    gstByRate.set(rate, entry);
  }
  const totalGst = [...gstByRate.values()].reduce((s, e) => s + e.gst, 0);

  return (
    <div className="print-sheet mx-auto max-w-3xl space-y-5">
      <div className="no-print flex items-center gap-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href={`/admin/orders/${order.id}`}>
            <ArrowLeft className="size-4" /> Order
          </Link>
        </Button>
        <PrintButton label="Print invoice" />
      </div>

      <div className="rounded-lg border p-8 text-sm text-black">
        {/* Header */}
        <div className="flex items-start justify-between gap-6 border-b pb-5">
          <div>
            <p className="font-heading text-2xl font-bold">{storeName}</p>
            <p className="mt-1 whitespace-pre-line text-xs text-neutral-600">{storeAddress}</p>
            <p className="text-xs text-neutral-600">
              {storePhone}
              {storeEmail && ` · ${storeEmail}`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold">Invoice</p>
            <p className="mt-1 font-mono text-sm">{order.orderNumber}</p>
            <p className="text-xs text-neutral-600">
              {order.createdAt.toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
            <p className="text-xs text-neutral-600">
              {ORDER_STATUS_LABELS[order.status as OrderStatus] ?? order.status}
            </p>
          </div>
        </div>

        {/* Bill to */}
        <div className="grid grid-cols-2 gap-6 border-b py-5">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Deliver to
            </p>
            <p className="font-medium">{order.shipName}</p>
            <p className="text-neutral-700">{order.shipLine1}</p>
            {order.shipLine2 && <p className="text-neutral-700">{order.shipLine2}</p>}
            <p className="text-neutral-700">
              {order.shipCity}, {order.shipState} — {order.shipPincode}
            </p>
            <p className="mt-1 text-neutral-700">{order.shipPhone}</p>
            {order.email && <p className="text-neutral-700">{order.email}</p>}
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Payment
            </p>
            <p className="text-neutral-700">
              {order.payment?.status === "CAPTURED" ? "Paid" : "Payment pending"}
            </p>
            {order.payment?.method && (
              <p className="text-neutral-700">Method: {order.payment.method}</p>
            )}
            {order.payment?.razorpayPaymentId && (
              <p className="break-all text-xs text-neutral-600">
                Ref: {order.payment.razorpayPaymentId}
              </p>
            )}
          </div>
        </div>

        {/* Items */}
        <table className="w-full border-collapse py-5 text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wide text-neutral-500">
              <th className="py-2 font-semibold">Item</th>
              <th className="py-2 text-center font-semibold">Qty</th>
              <th className="py-2 text-right font-semibold">Rate</th>
              <th className="py-2 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => {
              const note = packNote(item.variantLabel, item.basePackGrams ?? undefined);
              return (
                <tr key={item.id} className="border-b border-neutral-100">
                  <td className="py-2">
                    <span className="font-medium">{item.productName}</span>
                    <span className="block text-xs text-neutral-600">
                      {item.variantLabel}
                      {note && ` · ${note}`}
                    </span>
                  </td>
                  <td className="py-2 text-center">{item.qty}</td>
                  <td className="py-2 text-right">{formatINR(item.price)}</td>
                  <td className="py-2 text-right">{formatINR(item.price * item.qty)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Totals */}
        <div className="ml-auto mt-4 w-full max-w-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-neutral-600">Subtotal</span>
            <span>{formatINR(order.subtotal)}</span>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between">
              <span className="text-neutral-600">
                {order.couponCode ? `Coupon (${order.couponCode})` : "Bundle discount"}
              </span>
              <span>−{formatINR(order.discount)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-neutral-600">Shipping</span>
            <span>{order.shippingFee === 0 ? "FREE" : formatINR(order.shippingFee)}</span>
          </div>
          <div className="flex justify-between border-t pt-1 text-base font-semibold">
            <span>Total</span>
            <span>{formatINR(order.total)}</span>
          </div>
        </div>

        {/* GST summary — prices are inclusive, shown for the customer's records */}
        {totalGst > 0 && (
          <div className="mt-6 border-t pt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              GST summary (prices are GST-inclusive)
            </p>
            <table className="w-full max-w-sm border-collapse text-xs">
              <thead>
                <tr className="text-left text-neutral-500">
                  <th className="py-1 font-medium">Rate</th>
                  <th className="py-1 text-right font-medium">Taxable</th>
                  <th className="py-1 text-right font-medium">GST</th>
                </tr>
              </thead>
              <tbody>
                {[...gstByRate.entries()]
                  .sort((a, b) => a[0] - b[0])
                  .map(([rate, e]) => (
                    <tr key={rate}>
                      <td className="py-0.5">{rate}%</td>
                      <td className="py-0.5 text-right">{formatINR(e.taxable)}</td>
                      <td className="py-0.5 text-right">{formatINR(e.gst)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {order.notes && (
          <p className="mt-6 border-t pt-4 text-xs text-neutral-700">
            <span className="font-medium">Note:</span> {order.notes}
          </p>
        )}

        <p className="mt-8 text-center text-xs text-neutral-500">
          Thank you for your order! · {storeName}
        </p>
      </div>
    </div>
  );
}
