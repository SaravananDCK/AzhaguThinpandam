import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/queries";
import { SETTINGS } from "@/lib/constants";
import { gstFromInclusive } from "@/lib/finance";
import { formatDateNumeric } from "@/lib/dates";
import { packNote } from "@/lib/pack";
import { Button } from "@/components/ui/button";
import { ReceiptsView, type Receipt } from "./receipts-view";

export const metadata: Metadata = { title: "Thermal receipts" };

// Receipts go into the parcel, so the default list is what's about to be
// packed. Anything else (a reprint for a shipped order, one specific order
// from its page) comes in by id.
const AWAITING_DISPATCH = ["PAID", "CONFIRMED"];

type Props = { searchParams: Promise<{ ids?: string; all?: string }> };

export default async function ThermalReceiptsPage({ searchParams }: Props) {
  const { ids, all } = await searchParams;
  const wanted = ids?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];
  const showAll = all === "1";

  const [orders, settings] = await Promise.all([
    prisma.order.findMany({
      where: wanted.length
        ? { id: { in: wanted } }
        : showAll
          ? { status: { notIn: ["PENDING", "CANCELLED"] } }
          : { status: { in: AWAITING_DISPATCH } },
      include: { items: true, payment: true },
      orderBy: { createdAt: wanted.length || showAll ? "desc" : "asc" },
      take: 200,
    }),
    getSettings(),
  ]);

  const receipts: Receipt[] = orders.map((o) => {
    // Prices are GST-inclusive; back the tax out per rate for the summary
    const gstByRate = new Map<number, { taxable: number; gst: number }>();
    for (const item of o.items) {
      const rate = item.gstRate ?? 0;
      if (!rate) continue;
      const gross = item.price * item.qty;
      const gst = gstFromInclusive(gross, rate);
      const entry = gstByRate.get(rate) ?? { taxable: 0, gst: 0 };
      entry.taxable += gross - gst;
      entry.gst += gst;
      gstByRate.set(rate, entry);
    }
    return {
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      date: formatDateNumeric(o.createdAt),
      preorder: o.preorder,
      paid: o.payment?.status === "CAPTURED",
      paymentMethod: o.payment?.method ?? null,
      paymentRef: o.payment?.razorpayPaymentId ?? null,
      name: o.shipName,
      phone: o.shipPhone,
      address: [o.shipLine1, o.shipLine2, `${o.shipCity}, ${o.shipState} — ${o.shipPincode}`]
        .filter(Boolean)
        .join("\n"),
      items: o.items.map((i) => ({
        name: i.productName,
        label: i.variantLabel,
        note: packNote(i.variantLabel, i.basePackGrams ?? undefined) ?? null,
        qty: i.qty,
        price: i.price,
        isFreebie: i.isFreebie,
      })),
      subtotal: o.subtotal,
      discount: o.discount,
      discountLabel: o.couponCode ? `Coupon ${o.couponCode}` : "Bundle discount",
      manualDiscount: o.manualDiscount,
      shippingFee: o.shippingFee,
      total: o.total,
      gst: [...gstByRate.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([rate, e]) => ({ rate, ...e })),
      notes: o.notes,
    };
  });

  const paperMm = settings[SETTINGS.THERMAL_PAPER_WIDTH] === "58" ? 58 : 80;

  return (
    <div className="print-sheet space-y-5">
      <div className="no-print">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/admin/orders">
            <ArrowLeft className="size-4" /> Orders
          </Link>
        </Button>
        <h1 className="mt-2 font-heading text-2xl font-bold">Thermal receipts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Invoices for a {paperMm} mm thermal roll printer, one per order with a cut after
          each. Tick the orders, press Print and choose the thermal printer in the print
          dialog.{" "}
          {wanted.length
            ? "Showing the orders you picked."
            : showAll
              ? "Showing every paid order, newest first."
              : "Showing orders awaiting dispatch, oldest first."}{" "}
          Paper width is set in Settings → Printing.
        </p>
        {!wanted.length && (
          <Button asChild variant="outline" size="sm" className="mt-3">
            <Link href={showAll ? "/admin/orders/receipts" : "/admin/orders/receipts?all=1"}>
              {showAll ? "Only orders awaiting dispatch" : "Include shipped & delivered (reprints)"}
            </Link>
          </Button>
        )}
      </div>

      <ReceiptsView
        receipts={receipts}
        paperMm={paperMm}
        preselectAll={wanted.length > 0 || !showAll}
        store={{
          name: settings[SETTINGS.STORE_NAME],
          address: settings[SETTINGS.STORE_ADDRESS],
          phone: settings[SETTINGS.STORE_PHONE],
          email: settings[SETTINGS.STORE_EMAIL],
        }}
      />
    </div>
  );
}
