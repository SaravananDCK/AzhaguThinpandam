"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { INDIAN_STATES } from "@/lib/india-states";
import { createCustomer, updateCustomer } from "./actions";

export type CustomerFormValues = {
  id?: string;
  phone: string;
  name: string;
  email: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  isEmployee: boolean;
};

/**
 * `next` sends the admin back where they came from after saving — used when a
 * customer is created mid-way through writing up an order.
 */
export function CustomerForm({
  values,
  next,
}: {
  values: CustomerFormValues;
  next?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const editing = Boolean(values.id);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const res = editing
        ? await updateCustomer(values.id!, formData)
        : await createCustomer(formData);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(editing ? "Customer saved" : "Customer created");
      if (next) {
        // Carry the phone back so the order form can look them up immediately
        const phone = String(formData.get("phone") ?? "");
        router.push(`${next}${next.includes("?") ? "&" : "?"}phone=${encodeURIComponent(phone)}`);
      } else {
        router.push("/admin/customers");
      }
      router.refresh();
    });
  }

  return (
    <form action={handleSubmit} className="max-w-xl space-y-6">
      <Card>
        <CardContent className="space-y-4">
          <p className="font-semibold">Contact</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="c-phone">Mobile number</Label>
              <Input
                id="c-phone"
                name="phone"
                required
                inputMode="numeric"
                defaultValue={values.phone}
                placeholder="9876543210"
              />
              <p className="text-xs text-muted-foreground">
                This is how they log in and how orders are matched to them.
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="c-name">Name</Label>
              <Input id="c-name" name="name" required minLength={2} defaultValue={values.name} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="c-email">Email (optional)</Label>
            <Input
              id="c-email"
              name="email"
              type="email"
              defaultValue={values.email}
              placeholder="Leave blank if they don't have one"
            />
            <p className="text-xs text-muted-foreground">
              Order confirmations go here. Blank means no emails are sent.
            </p>
          </div>
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              name="isEmployee"
              defaultChecked={values.isEmployee}
              className="mt-0.5 size-4 accent-primary"
            />
            <span className="text-sm">
              Staff member
              <span className="block text-xs text-muted-foreground">
                Buys at wholesale cost + ₹5 per packet. No bundle discount,
                goodies, coupons or delivery charge.
              </span>
            </span>
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4">
          <p className="font-semibold">Default delivery address (optional)</p>
          <p className="text-xs text-muted-foreground">
            Fill this in and new orders for this customer are prefilled with it.
            Leave it blank if you don&apos;t have their address yet.
          </p>
          <div className="grid gap-2">
            <Label htmlFor="c-line1">Address line 1</Label>
            <Input id="c-line1" name="line1" defaultValue={values.line1} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="c-line2">Address line 2</Label>
            <Input id="c-line2" name="line2" defaultValue={values.line2} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="c-city">City</Label>
              <Input id="c-city" name="city" defaultValue={values.city} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="c-state">State</Label>
              <select
                id="c-state"
                name="state"
                defaultValue={values.state || "Tamil Nadu"}
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
              <Label htmlFor="c-pin">Pincode</Label>
              <Input id="c-pin" name="pincode" defaultValue={values.pincode} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="size-4 animate-spin" />}
        {editing ? "Save customer" : "Create customer"}
      </Button>
    </form>
  );
}
