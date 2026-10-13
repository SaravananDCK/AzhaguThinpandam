"use client";

import { useState } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatINR } from "@/lib/money";

export type Receipt = {
  id: string;
  orderNumber: string;
  status: string;
  date: string;
  preorder: boolean;
  paid: boolean;
  paymentMethod: string | null;
  paymentRef: string | null;
  name: string;
  phone: string;
  /** Multi-line delivery address */
  address: string;
  items: {
    name: string;
    label: string;
    note: string | null;
    qty: number;
    price: number;
    isFreebie: boolean;
  }[];
  subtotal: number;
  discount: number;
  discountLabel: string;
  manualDiscount: number;
  shippingFee: number;
  total: number;
  gst: { rate: number; taxable: number; gst: number }[];
  notes: string | null;
};

type Store = { name: string; address: string; phone: string; email: string };

/**
 * Receipts laid out for a thermal roll: one column as wide as the paper,
 * black text only, dashed rules, a page break after each so the printer cuts
 * between orders. The paper width comes from Settings; the receipt is drawn at
 * that width on screen too, so what you see is what comes off the roll.
 */
export function ReceiptsView({
  receipts,
  paperMm,
  preselectAll,
  store,
}: {
  receipts: Receipt[];
  paperMm: 58 | 80;
  preselectAll: boolean;
  store: Store;
}) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(preselectAll ? receipts.map((r) => r.id) : [])
  );
  const chosen = receipts.filter((r) => selected.has(r.id));
  // Thermal drivers print edge to edge; a small margin keeps text off the tear line
  const marginMm = 3;
  const contentMm = paperMm - marginMm * 2;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (!receipts.length) {
    return (
      <p className="text-sm text-muted-foreground">
        Nothing to print. Orders appear here once they&apos;re marked paid or confirmed.
      </p>
    );
  }

  return (
    <>
      {/* Overrides the site-wide A4 page box for this screen only. Height
          "auto" lets the roll run as long as the receipt needs. */}
      <style>{`@media print { @page { size: ${paperMm}mm auto; margin: ${marginMm}mm; } }`}</style>

      <Card className="no-print">
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-semibold">
              {chosen.length} of {receipts.length} selected
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelected(new Set(receipts.map((r) => r.id)))}
              >
                Select all
              </Button>
              <Button variant="outline" size="sm" onClick={() => setSelected(new Set())}>
                Clear
              </Button>
              <Button size="sm" onClick={() => window.print()} disabled={!chosen.length}>
                <Printer className="size-4" /> Print {chosen.length} receipt
                {chosen.length === 1 ? "" : "s"}
              </Button>
            </div>
          </div>
          <div className="max-h-80 space-y-1 overflow-y-auto">
            {receipts.map((r) => (
              <label
                key={r.id}
                className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-muted/60"
              >
                <input
                  type="checkbox"
                  checked={selected.has(r.id)}
                  onChange={() => toggle(r.id)}
                  className="size-4 accent-primary"
                />
                <span className="font-mono text-xs">{r.orderNumber}</span>
                <span className="flex-1 truncate font-medium">{r.name}</span>
                <span className="text-xs text-muted-foreground">{formatINR(r.total)}</span>
                <span className="text-xs text-muted-foreground">{r.status}</span>
                <span className="text-xs text-muted-foreground">{r.date}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-6 print:block">
        {chosen.map((r, i) => (
          <div
            key={r.id}
            style={{ width: `${contentMm}mm` }}
            className={`thermal-receipt bg-white p-0 font-mono text-[11px] leading-[1.35] text-black print:border-0 ${
              i > 0 ? "print-page-break" : ""
            } border border-dashed border-neutral-400`}
          >
            <div className="text-center">
              <p className="text-[14px] font-bold uppercase">{store.name}</p>
              <p className="whitespace-pre-line">{store.address}</p>
              <p>
                {store.phone}
                {store.email && ` · ${store.email}`}
              </p>
            </div>

            <Rule />
            <div className="flex justify-between">
              <span>Invoice</span>
              <span className="font-bold">{r.orderNumber}</span>
            </div>
            <div className="flex justify-between">
              <span>Date</span>
              <span>{r.date}</span>
            </div>
            <div className="flex justify-between">
              <span>Payment</span>
              <span>
                {r.paid ? "PAID" : "PENDING"}
                {r.paymentMethod && ` · ${r.paymentMethod}`}
              </span>
            </div>
            {r.paymentRef && <p className="break-all">Ref {r.paymentRef}</p>}
            {r.preorder && <p className="font-bold">PRE-ORDER</p>}

            <Rule />
            <p className="font-bold">Deliver to</p>
            <p className="font-bold">{r.name}</p>
            <p className="whitespace-pre-line">{r.address}</p>
            <p>{r.phone}</p>

            <Rule />
            {r.items.map((it, idx) => (
              <div key={idx} className="mb-1">
                <p className="font-bold">
                  {it.name}
                  {it.isFreebie && " (FREE)"}
                </p>
                <div className="flex justify-between">
                  <span>
                    {it.label}
                    {it.note && ` · ${it.note}`} × {it.qty}
                    {!it.isFreebie && ` @ ${formatINR(it.price)}`}
                  </span>
                  <span className="shrink-0 pl-2">
                    {it.isFreebie ? "FREE" : formatINR(it.price * it.qty)}
                  </span>
                </div>
              </div>
            ))}

            <Rule />
            <Line label="Subtotal" value={formatINR(r.subtotal)} />
            {r.discount > 0 && <Line label={r.discountLabel} value={`-${formatINR(r.discount)}`} />}
            {r.manualDiscount > 0 && (
              <Line label="Discount" value={`-${formatINR(r.manualDiscount)}`} />
            )}
            <Line label="Shipping" value={r.shippingFee === 0 ? "FREE" : formatINR(r.shippingFee)} />
            <div className="mt-1 flex justify-between text-[14px] font-bold">
              <span>TOTAL</span>
              <span>{formatINR(r.total)}</span>
            </div>

            {r.gst.length > 0 && (
              <>
                <Rule />
                <p>GST (included in prices)</p>
                {r.gst.map((g) => (
                  <Line
                    key={g.rate}
                    label={`${g.rate}% on ${formatINR(g.taxable)}`}
                    value={formatINR(g.gst)}
                  />
                ))}
              </>
            )}

            {r.notes && (
              <>
                <Rule />
                <p>Note: {r.notes}</p>
              </>
            )}

            <Rule />
            <p className="pb-2 text-center">Thank you for your order!</p>
          </div>
        ))}
      </div>
    </>
  );
}

function Rule() {
  return <div className="my-1.5 border-t border-dashed border-black" />;
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span>{label}</span>
      <span className="shrink-0">{value}</span>
    </div>
  );
}
