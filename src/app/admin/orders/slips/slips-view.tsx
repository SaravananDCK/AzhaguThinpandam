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
  const [selected, setSelected] = useState<Set<string>>(new Set(orders.map((o) => o.id)));

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
        No orders are waiting to be shipped.
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
                <span className="text-xs text-muted-foreground">{o.createdAt}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* The sheet itself. Two columns of A6-ish slips = 4 per A4 page. */}
      <div className="grid grid-cols-2 gap-0 print:gap-0">
        {chosen.map((o) => (
          <div
            key={o.id}
            className="print-slip flex h-[74mm] flex-col justify-between border border-dashed border-neutral-400 p-4 text-black"
          >
            <div>
              <p className="text-[10px] uppercase tracking-wide text-neutral-500">To</p>
              <p className="text-base font-bold leading-tight">{o.name}</p>
              <p className="mt-0.5 text-sm leading-snug">{o.line1}</p>
              {o.line2 && <p className="text-sm leading-snug">{o.line2}</p>}
              <p className="text-sm leading-snug">
                {o.city}, {o.state}
              </p>
              <p className="text-sm font-semibold">PIN {o.pincode}</p>
              <p className="mt-1 text-sm">📞 {o.phone}</p>
            </div>

            <div className="mt-2 border-t border-neutral-300 pt-2">
              <div className="flex items-baseline justify-between">
                <p className="font-mono text-xs font-semibold">{o.orderNumber}</p>
                <p className="text-[10px] text-neutral-600">
                  {o.itemCount} item{o.itemCount === 1 ? "" : "s"}
                </p>
              </div>
              <p className="mt-1 text-[10px] leading-tight text-neutral-600">
                <span className="font-medium">From:</span> {from.name}, {from.address}
                {from.phone && ` · ${from.phone}`}
              </p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
