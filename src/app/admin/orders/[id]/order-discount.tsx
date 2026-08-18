"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, TicketPercent } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatINR, paiseToRupees } from "@/lib/money";
import { setOrderDiscount } from "../actions";

/**
 * Ad-hoc "₹50 off" on an unpaid order — the discount agreed over WhatsApp that
 * no coupon covers. Unpaid only; see setOrderDiscount for why.
 */
export function OrderDiscount({
  orderId,
  manualDiscount,
  discountNote,
  maxDiscount,
}: {
  orderId: string;
  manualDiscount: number;
  discountNote: string | null;
  maxDiscount: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [amount, setAmount] = useState(
    manualDiscount ? paiseToRupees(manualDiscount) : ""
  );
  const [note, setNote] = useState(discountNote ?? "");

  function save(nextAmount: string) {
    startTransition(async () => {
      const res = await setOrderDiscount(orderId, nextAmount || "0", note);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(
        nextAmount && nextAmount !== "0"
          ? `Discount applied — new total ${formatINR(res.total!)}`
          : "Discount removed"
      );
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <TicketPercent className="size-3.5" />
        {manualDiscount > 0 ? "Change discount" : "Add discount"}
      </Button>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="od-amount">Discount ₹</Label>
          <Input
            id="od-amount"
            type="number"
            min="0"
            step="0.01"
            max={paiseToRupees(maxDiscount)}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            autoFocus
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="od-note">Reason (optional)</Label>
          <Input
            id="od-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Regular customer"
            maxLength={200}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Comes off the total the customer is asked to pay, up to{" "}
        {formatINR(maxDiscount)}. The UPI amount and QR update with it, and it
        survives editing the items.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => save(amount)} disabled={pending}>
          {pending && <Loader2 className="size-3.5 animate-spin" />} Save discount
        </Button>
        {manualDiscount > 0 && (
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive"
            onClick={() => {
              setAmount("");
              save("0");
            }}
            disabled={pending}
          >
            Remove
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
