"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatINR } from "@/lib/money";
import { updateOrderItems } from "../actions";

type Variant = { id: string; label: string; price: number; stock: number };
type Line = { variantId: string; qty: number };

export function EditOrderItems({
  orderId,
  variants,
  currentItems,
  couponCode,
}: {
  orderId: string;
  variants: Variant[];
  currentItems: Line[];
  couponCode: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [lines, setLines] = useState<Line[]>(currentItems);
  const byId = new Map(variants.map((v) => [v.id, v]));

  const subtotal = lines.reduce(
    (sum, l) => sum + (byId.get(l.variantId)?.price ?? 0) * l.qty,
    0
  );

  function setLine(i: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  function save() {
    const items = lines.filter((l) => l.variantId && l.qty > 0);
    if (!items.length) {
      toast.error("An order needs at least one item.");
      return;
    }
    startTransition(async () => {
      const res = await updateOrderItems(orderId, items, couponCode ?? undefined);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(`Order updated — new total ${formatINR(res.total!)}`);
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="no-print"
        onClick={() => {
          setLines(currentItems);
          setOpen(true);
        }}
      >
        <Pencil className="size-4" /> Edit items
      </Button>
    );
  }

  return (
    <div className="no-print space-y-3 rounded-lg border p-3">
      {lines.map((line, i) => {
        const v = byId.get(line.variantId);
        return (
          <div key={i} className="flex items-center gap-2">
            <select
              value={line.variantId}
              onChange={(e) => setLine(i, { variantId: e.target.value })}
              className="h-9 flex-1 rounded-md border bg-background px-2 text-sm"
              aria-label={`Item ${i + 1}`}
            >
              <option value="">Select an item…</option>
              {variants.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label} — {formatINR(v.price)} ({v.stock} in stock)
                </option>
              ))}
            </select>
            <Input
              type="number"
              min={1}
              max={99}
              value={line.qty}
              onChange={(e) => setLine(i, { qty: Number(e.target.value) || 1 })}
              className="w-20"
              aria-label={`Quantity for item ${i + 1}`}
            />
            <span className="w-24 text-right text-sm font-medium">
              {v ? formatINR(v.price * line.qty) : "—"}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setLines((p) => p.filter((_, idx) => idx !== i))}
              disabled={lines.length === 1}
              aria-label={`Remove item ${i + 1}`}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        );
      })}

      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setLines((p) => [...p, { variantId: "", qty: 1 }])}
        >
          <Plus className="size-4" /> Add item
        </Button>
        <span className="text-sm">
          Items subtotal <span className="font-semibold">{formatINR(subtotal)}</span>
        </span>
      </div>

      <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
        Saving reprices the whole order with the same rules as the website —
        current prices, bundle discount for the new weight, and shipping for the
        delivery state. The total will change.
        {couponCode && ` Coupon ${couponCode} is re-checked against the new subtotal.`}
      </p>

      <div className="flex gap-2">
        <Button size="sm" onClick={save} disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />} Save &amp; reprice
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
