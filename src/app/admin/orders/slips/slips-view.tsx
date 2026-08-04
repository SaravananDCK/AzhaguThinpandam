"use client";

import { useState } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export type Slip = {
  id: string;
  orderNumber: string;
  status: string;
  name: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  itemCount: number;
  createdAt: string;
};

export type FromAddress = { name: string; address: string; phone: string };

export function SlipsView({ orders, from }: { orders: Slip[]; from: FromAddress }) {
  // Pre-select what's actually going out. Already-shipped orders only appear
  // when you ask for them (for a reprint), so they start unticked — otherwise
  // "Print" would reprint labels for parcels that already left.
  const [selected, setSelected] = useState<Set<string>>(
    new Set(orders.filter((o) => o.status !== "SHIPPED").map((o) => o.id))
  );

  const chosen = orders.filter((o) => selected.has(o.id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (!orders.length) {
    return (
      <p className="text-sm text-muted-foreground">
        Nothing is waiting to be dispatched. Orders appear here once they&apos;re
        marked paid or confirmed.
      </p>
    );
  }

  return (
    <>
      {/* Picker — screen only */}
      <Card className="no-print">
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-semibold">
              {chosen.length} of {orders.length} selected
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelected(new Set(orders.map((o) => o.id)))}
              >
                Select all
              </Button>
              <Button variant="outline" size="sm" onClick={() => setSelected(new Set())}>
                Clear
              </Button>
              <Button size="sm" onClick={() => window.print()} disabled={!chosen.length}>
                <Printer className="size-4" /> Print {chosen.length} slip
                {chosen.length === 1 ? "" : "s"}
              </Button>
            </div>
          </div>
          <div className="max-h-80 space-y-1 overflow-y-auto">
            {orders.map((o) => (
              <label
                key={o.id}
                className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-muted/60"
              >
                <input
                  type="checkbox"
                  checked={selected.has(o.id)}
                  onChange={() => toggle(o.id)}
                  className="size-4 accent-primary"
                />
                <span className="font-mono text-xs">{o.orderNumber}</span>
                <span className="flex-1 truncate font-medium">{o.name}</span>
                <span className="hidden truncate text-muted-foreground sm:block">
                  {o.city}, {o.state}
                </span>
                <span className="text-xs text-muted-foreground">{o.status}</span>
                <span className="text-xs text-muted-foreground">{o.createdAt}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Three full-width slips per A4. Single column so the address gets the
          whole page width and can be set large enough to read at arm's length
          on a parcel. 88mm each × 3 = 264mm, inside A4's 277mm printable height. */}
      <div className="grid grid-cols-1 gap-0">
        {chosen.map((o) => (
          <div
            key={o.id}
            className="print-slip flex h-[88mm] flex-col justify-between border border-dashed border-neutral-400 p-5 text-black"
          >
            {/* Sender strip */}
            <div className="flex items-center justify-between gap-3 border-b border-neutral-300 pb-2">
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="" className="size-9 shrink-0 rounded-full" />
                <div className="leading-tight">
                  <p className="text-sm font-bold">{from.name}</p>
                  <p className="text-[10px] text-neutral-600">
                    {from.address}
                    {from.phone && ` · ${from.phone}`}
                  </p>
                </div>
              </div>
              <p className="shrink-0 font-mono text-xs font-semibold">{o.orderNumber}</p>
            </div>

            {/* Recipient — the part that has to be readable on a parcel */}
            <div className="flex-1 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-500">
                To
              </p>
              <p className="text-2xl font-bold leading-tight">{o.name}</p>
              <p className="mt-1 text-lg leading-snug">{o.line1}</p>
              {o.line2 && <p className="text-lg leading-snug">{o.line2}</p>}
              <p className="text-lg leading-snug">
                {o.city}, {o.state}
              </p>
              <div className="mt-1.5 flex items-baseline gap-5">
                <p className="text-xl font-bold">PIN {o.pincode}</p>
                <p className="text-lg font-medium">📞 {o.phone}</p>
              </div>
            </div>

            <p className="text-right text-[11px] text-neutral-600">
              {o.itemCount} item{o.itemCount === 1 ? "" : "s"}
            </p>
          </div>
        ))}
      </div>
    </>
  );
}
