"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, TicketPercent } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatINR, paiseToRupees } from "@/lib/money";
import { adjustOrderTotals } from "../actions";

/**
 * Hand-adjusts the money on an unpaid order: the "₹50 off" agreed over
 * WhatsApp, and a delivery charge set by hand when the computed one is wrong.
 * Unpaid only — see adjustOrderTotals for why.
 */
export function AdjustTotals({
  orderId,
  manualDiscount,
  discountNote,
  shippingFee,
  maxDiscount,
}: {
  orderId: string;
  manualDiscount: number;
  discountNote: string | null;
  shippingFee: number;
  maxDiscount: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [discount, setDiscount] = useState(
    manualDiscount ? paiseToRupees(manualDiscount) : "0"
  );
  const [note, setNote] = useState(discountNote ?? "");
  const [shipping, setShipping] = useState(paiseToRupees(shippingFee));

  function save(d: string, s: string) {
    startTransition(async () => {
      const res = await adjustOrderTotals(orderId, d || "0", note, s || "0");
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
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <TicketPercent className="size-3.5" />
        {manualDiscount > 0 ? "Change discount / shipping" : "Adjust discount / shipping"}
      </Button>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="grid gap-1.5">
          <Label htmlFor="at-discount">Discount ₹</Label>
          <Input
            id="at-discount"
            type="number"
            min="0"
            step="0.01"
            max={paiseToRupees(maxDiscount)}
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
            autoFocus
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="at-shipping">Shipping ₹</Label>
          <Input
            id="at-shipping"
            type="number"
            min="0"
            step="0.01"
            value={shipping}
            onChange={(e) => setShipping(e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="at-note">Reason (optional)</Label>
          <Input
            id="at-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Regular customer"
            maxLength={200}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Both change what the customer is asked to pay — the UPI amount and QR
        follow, and they survive editing the items. Discount can be at most{" "}
        {formatINR(maxDiscount)}. Set shipping to 0 for free delivery.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => save(discount, shipping)} disabled={pending}>
          {pending && <Loader2 className="size-3.5 animate-spin" />} Save
        </Button>
        {manualDiscount > 0 && (
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive"
            onClick={() => {
              setDiscount("0");
              save("0", shipping);
            }}
            disabled={pending}
          >
            Remove discount
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
