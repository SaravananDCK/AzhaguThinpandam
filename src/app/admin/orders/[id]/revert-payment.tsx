"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatINR } from "@/lib/money";
import { revertOrderToPending } from "../actions";

/**
 * Undoes a payment confirmation — offered only on paid orders, see
 * revertOrderToPending for why that is the safe boundary.
 */
export function RevertPayment({
  orderId,
  orderNumber,
  customer,
  total,
}: {
  orderId: string;
  orderNumber: string;
  customer: string;
  total: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Undo2 className="size-3.5" /> Undo payment
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Move this order back to payment pending?</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p>
              <span className="font-mono font-semibold">{orderNumber}</span> —{" "}
              {customer} · {formatINR(total)}
            </p>
            <p className="font-medium text-destructive">
              This does not refund anything at Razorpay. If money was actually
              taken, refund it from the Razorpay dashboard as well.
            </p>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              <li>Stock from this order goes back on the shelf</li>
              <li>Its sale entries leave the stock ledger</li>
              <li>Any coupon is released back to the customer&apos;s limit</li>
              <li>
                The order drops out of revenue and GST reports — if the month
                has already been reported, that figure changes
              </li>
              <li>
                The confirmation email has already gone out and can&apos;t be
                unsent
              </li>
            </ul>
            <p className="text-muted-foreground">
              You can mark it paid again afterwards, which redoes all of the
              above.
            </p>
            <div className="flex gap-2 pt-1">
              <Button
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const res = await revertOrderToPending(orderId);
                    if (res.error) {
                      toast.error(res.error);
                      return;
                    }
                    toast.success(`Order ${orderNumber} moved back to payment pending`);
                    setOpen(false);
                    router.refresh();
                  })
                }
              >
                {pending && <Loader2 className="size-3.5 animate-spin" />}
                Undo the payment
              </Button>
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
                Leave it paid
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
