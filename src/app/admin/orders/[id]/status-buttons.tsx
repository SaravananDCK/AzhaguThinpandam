"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { NEXT_STATUSES, ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/constants";
import { updateOrderStatus } from "../actions";

export function StatusButtons({
  orderId,
  currentStatus,
}: {
  orderId: string;
  currentStatus: OrderStatus;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const nextOptions = NEXT_STATUSES[currentStatus] ?? [];

  if (nextOptions.length === 0) {
    return <p className="text-sm text-muted-foreground">No further actions for this order.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {nextOptions.map((status) => (
        <Button
          key={status}
          size="sm"
          variant={status === "CANCELLED" ? "destructive" : "default"}
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await updateOrderStatus(orderId, status);
              if (res.error) toast.error(res.error);
              else {
                toast.success(`Order marked ${ORDER_STATUS_LABELS[status]}`);
                router.refresh();
              }
            })
          }
        >
          {pending && <Loader2 className="size-3.5 animate-spin" />}
          Mark {ORDER_STATUS_LABELS[status]}
        </Button>
      ))}
    </div>
  );
}
