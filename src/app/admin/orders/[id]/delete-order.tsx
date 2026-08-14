"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatINR } from "@/lib/money";
import { deleteOrder } from "../actions";

/**
 * Permanent removal, offered only on payment-pending and cancelled orders —
 * see deleteOrder for why those two are the safe set.
 */
export function DeleteOrder({
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
      <Button
        size="sm"
        variant="outline"
        className="text-destructive hover:text-destructive"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="size-3.5" /> Delete order
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete this order?</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p>
              <span className="font-mono font-semibold">{orderNumber}</span> —{" "}
              {customer} · {formatINR(total)}
            </p>
            <p className="text-muted-foreground">
              The order, its items and its payment record are removed
              permanently. This can&apos;t be undone. Stock isn&apos;t affected.
            </p>
            <div className="flex gap-2 pt-1">
              <Button
                variant="destructive"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const res = await deleteOrder(orderId);
                    if (res.error) {
                      toast.error(res.error);
                      return;
                    }
                    toast.success(`Order ${orderNumber} deleted`);
                    // This page no longer exists
                    router.push("/admin/orders");
                    router.refresh();
                  })
                }
              >
                {pending && <Loader2 className="size-3.5 animate-spin" />}
                Delete permanently
              </Button>
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
                Keep it
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
