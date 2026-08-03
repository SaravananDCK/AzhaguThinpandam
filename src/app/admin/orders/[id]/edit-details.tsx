"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { INDIAN_STATES } from "@/lib/india-states";
import { updateOrderDetails } from "../actions";

export type OrderDetails = {
  id: string;
  shipName: string;
  shipPhone: string;
  shipLine1: string;
  shipLine2: string;
  shipCity: string;
  shipState: string;
  shipPincode: string;
  email: string;
  notes: string;
};

export function EditOrderDetails({ order }: { order: OrderDetails }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const res = await updateOrderDetails(order.id, formData);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Order details updated");
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Pencil className="size-4" /> Edit details
      </Button>
    );
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="e-name">Recipient name</Label>
          <Input id="e-name" name="shipName" required defaultValue={order.shipName} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="e-phone">Mobile number</Label>
          <Input
            id="e-phone"
            name="shipPhone"
            required
            pattern="[6-9][0-9]{9}"
            title="10-digit mobile number"
            defaultValue={order.shipPhone}
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="e-line1">Address line 1</Label>
        <Input id="e-line1" name="shipLine1" required defaultValue={order.shipLine1} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="e-line2">Address line 2</Label>
        <Input id="e-line2" name="shipLine2" defaultValue={order.shipLine2} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="grid gap-2">
          <Label htmlFor="e-city">City</Label>
          <Input id="e-city" name="shipCity" required defaultValue={order.shipCity} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="e-state">State</Label>
          <select
            id="e-state"
            name="shipState"
            required
            defaultValue={order.shipState}
            className="h-9 rounded-md border bg-background px-2 text-sm"
          >
            {INDIAN_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="e-pin">Pincode</Label>
          <Input
            id="e-pin"
            name="shipPincode"
            required
            pattern="[0-9]{6}"
            title="6-digit pincode"
            defaultValue={order.shipPincode}
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="e-email">Email</Label>
        <Input id="e-email" name="email" type="email" defaultValue={order.email} />
        <p className="text-xs text-muted-foreground">
          Blank means no order emails are sent for this order.
        </p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="e-notes">Notes</Label>
        <Textarea id="e-notes" name="notes" rows={2} defaultValue={order.notes} />
      </div>

      <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
        Items, quantities and prices aren&apos;t editable here — the totals, stock
        movements and GST were all derived from them, so changing them after the
        fact would put money and stock out of step. Cancel and re-create the
        order instead. <strong>Changing the state does not recalculate shipping</strong>{" "}
        on an order that&apos;s already priced.
      </p>

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />} Save changes
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
