"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatINR } from "@/lib/money";
import { INDIAN_STATES } from "@/lib/india-states";
import { createAdminOrder } from "../actions";

type Variant = { id: string; label: string; price: number; stock: number };
type Line = { variantId: string; qty: number };

export function NewOrderForm({ variants }: { variants: Variant[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [lines, setLines] = useState<Line[]>([{ variantId: "", qty: 1 }]);
  const byId = new Map(variants.map((v) => [v.id, v]));

  // Indicative only — the server recomputes discounts and shipping, which is
  // what the customer is actually charged.
  const subtotal = lines.reduce(
    (sum, l) => sum + (byId.get(l.variantId)?.price ?? 0) * l.qty,
    0
  );

  function setLine(i: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  function handleSubmit(formData: FormData) {
    const items = lines
      .filter((l) => l.variantId && l.qty > 0)
      .map((l) => ({ variantId: l.variantId, qty: l.qty }));
    if (!items.length) {
      toast.error("Add at least one item.");
      return;
    }
    const seen = new Set(items.map((i) => i.variantId));
    if (seen.size !== items.length) {
      toast.error("The same item is listed twice — combine them into one line.");
      return;
    }

    startTransition(async () => {
      const res = await createAdminOrder({
        email: String(formData.get("email") ?? ""),
        customerName: String(formData.get("customerName") ?? ""),
        notes: String(formData.get("notes") ?? "") || undefined,
        couponCode: String(formData.get("couponCode") ?? "") || undefined,
        markPaid: formData.get("markPaid") === "on",
        address: {
          name: String(formData.get("name") ?? ""),
          phone: String(formData.get("phone") ?? ""),
          line1: String(formData.get("line1") ?? ""),
          line2: String(formData.get("line2") ?? ""),
          city: String(formData.get("city") ?? ""),
          state: String(formData.get("state") ?? ""),
          pincode: String(formData.get("pincode") ?? ""),
        },
        items,
      });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(`Order ${res.orderNumber} created`);
      router.push(`/admin/orders`);
      router.refresh();
    });
  }

  return (
    <form action={handleSubmit} className="max-w-2xl space-y-6">
      <Card>
        <CardContent className="space-y-4">
          <p className="font-semibold">Customer</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="o-phone">Mobile number</Label>
              <Input
                id="o-phone"
                name="phone"
                required
                inputMode="numeric"
                pattern="[6-9][0-9]{9}"
                title="10-digit mobile number"
                placeholder="9876543210"
              />
              <p className="text-xs text-muted-foreground">
                Their account is matched or created from this number, so it lines
                up with their order history if they log in later.
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="o-email">Email (optional)</Label>
              <Input id="o-email" name="email" type="email" placeholder="Leave blank if none" />
              <p className="text-xs text-muted-foreground">
                Blank means no confirmation email is sent.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4">
          <p className="font-semibold">Delivery address</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="o-name">Full name</Label>
              <Input id="o-name" name="name" required minLength={2} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="o-cname">Account name (if different)</Label>
              <Input id="o-cname" name="customerName" placeholder="Optional" />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="o-line1">Address line 1</Label>
            <Input id="o-line1" name="line1" required minLength={3} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="o-line2">Address line 2 (optional)</Label>
            <Input id="o-line2" name="line2" />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="o-city">City</Label>
              <Input id="o-city" name="city" required minLength={2} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="o-state">State</Label>
              <select
                id="o-state"
                name="state"
                required
                defaultValue="Tamil Nadu"
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
              <Label htmlFor="o-pin">Pincode</Label>
              <Input id="o-pin" name="pincode" required pattern="[0-9]{6}" title="6-digit pincode" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4">
          <p className="font-semibold">Items</p>
          <div className="space-y-2">
            {lines.map((line, i) => {
              const v = byId.get(line.variantId);
              return (
                <div key={i} className="flex items-end gap-2">
                  <div className="grid flex-1 gap-2">
                    <Label htmlFor={`line-${i}`} className="sr-only">
                      Item {i + 1}
                    </Label>
                    <select
                      id={`line-${i}`}
                      value={line.variantId}
                      onChange={(e) => setLine(i, { variantId: e.target.value })}
                      className="h-9 rounded-md border bg-background px-2 text-sm"
                    >
                      <option value="">Select an item…</option>
                      {variants.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.label} — {formatINR(v.price)} ({v.stock} in stock)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid w-20 gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={99}
                      value={line.qty}
                      onChange={(e) => setLine(i, { qty: Number(e.target.value) || 1 })}
                      aria-label={`Quantity for item ${i + 1}`}
                    />
                  </div>
                  <div className="w-24 pb-2 text-right text-sm font-medium">
                    {v ? formatINR(v.price * line.qty) : "—"}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="mb-0.5"
                    onClick={() => setLines((p) => p.filter((_, idx) => idx !== i))}
                    disabled={lines.length === 1}
                    aria-label={`Remove item ${i + 1}`}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              );
            })}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setLines((p) => [...p, { variantId: "", qty: 1 }])}
          >
            <Plus className="size-4" /> Add item
          </Button>
          <div className="flex justify-between border-t pt-3 text-sm">
            <span className="text-muted-foreground">Items subtotal</span>
            <span className="font-semibold">{formatINR(subtotal)}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Bundle discount and shipping are added when you save, using the same
            rules as the website — the final total appears on the order.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4">
          <p className="font-semibold">Extras</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="o-coupon">Coupon code (optional)</Label>
              <Input id="o-coupon" name="couponCode" className="uppercase" />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="o-notes">Order notes (optional)</Label>
            <Textarea id="o-notes" name="notes" rows={2} />
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="markPaid" className="mt-0.5 size-4 accent-primary" />
            <span>
              Payment already received
              <span className="block text-xs text-muted-foreground">
                Marks the order paid straight away — deducts stock and sends the
                confirmation email. Leave unticked to keep it at{" "}
                <strong>Payment pending</strong> and confirm later.
              </span>
            </span>
          </label>
        </CardContent>
      </Card>

      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="size-4 animate-spin" />} Create order
      </Button>
    </form>
  );
}
