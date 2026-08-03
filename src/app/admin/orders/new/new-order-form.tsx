"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { Check, Loader2, Plus, Search, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatINR } from "@/lib/money";
import { INDIAN_STATES } from "@/lib/india-states";
import type { CustomerLookup } from "@/lib/admin-orders";
import { createAdminOrder, findCustomerByPhone } from "../actions";

type Variant = { id: string; label: string; price: number; stock: number };
type Line = { variantId: string; qty: number };

export function NewOrderForm({
  variants,
  initialPhone = "",
  initialLookup = null,
}: {
  variants: Variant[];
  initialPhone?: string;
  initialLookup?: CustomerLookup | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [lines, setLines] = useState<Line[]>([{ variantId: "", qty: 1 }]);
  const byId = new Map(variants.map((v) => [v.id, v]));

  // Step 1 is always "who is this order for?" — the rest of the form only
  // appears once that's answered, so an order can't be written up against a
  // customer who turns out not to exist.
  const [phone, setPhone] = useState(initialPhone);
  const [lookup, setLookup] = useState<CustomerLookup | null>(initialLookup);
  const [looking, setLooking] = useState(false);

  const runLookup = useCallback(async (value: string) => {
    if (!/^\d{10}$/.test(value.replace(/\D/g, "").slice(-10))) {
      toast.error("Enter a 10-digit mobile number.");
      return;
    }
    setLooking(true);
    try {
      setLookup(await findCustomerByPhone(value));
    } catch {
      toast.error("Could not look up that number.");
    } finally {
      setLooking(false);
    }
  }, []);

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
        email: lookup?.email ?? "",
        customerName: lookup?.name ?? "",
        notes: String(formData.get("notes") ?? "") || undefined,
        couponCode: String(formData.get("couponCode") ?? "") || undefined,
        markPaid: formData.get("markPaid") === "on",
        address: {
          name: String(formData.get("name") ?? ""),
          phone,
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
          <p className="font-semibold">1. Who is this order for?</p>
          <div className="flex items-end gap-2">
            <div className="grid flex-1 gap-2">
              <Label htmlFor="o-phone">Mobile number</Label>
              <Input
                id="o-phone"
                inputMode="numeric"
                placeholder="9876543210"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setLookup(null); // a changed number invalidates the match
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    runLookup(phone);
                  }
                }}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => runLookup(phone)}
              disabled={looking || !phone.trim()}
            >
              {looking ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
              Find customer
            </Button>
          </div>

          {lookup?.found && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm dark:border-green-900 dark:bg-green-950/50">
              <p className="flex items-center gap-2 font-medium text-green-800 dark:text-green-200">
                <Check className="size-4" /> {lookup.name || "Existing customer"}
              </p>
              <p className="mt-1 text-xs text-green-800/80 dark:text-green-200/80">
                {lookup.email ? `${lookup.email} · ` : "No email on file · "}
                {lookup.orderCount} previous order{lookup.orderCount === 1 ? "" : "s"}
                {lookup.source === "orders" &&
                  " · from earlier orders — no account yet, one will be created"}
                {lookup.address && ". Their saved address is filled in below."}
              </p>
            </div>
          )}

          {lookup && !lookup.found && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/50">
              <p className="font-medium text-amber-900 dark:text-amber-100">
                No customer found for {phone}
              </p>
              <p className="mt-1 text-xs text-amber-900/80 dark:text-amber-100/80">
                Create them first — you&apos;ll come straight back here with the
                number filled in.
              </p>
              <Button asChild size="sm" variant="outline" className="mt-2">
                <Link
                  href={`/admin/customers/new?phone=${encodeURIComponent(phone)}&next=/admin/orders/new`}
                >
                  <UserPlus className="size-4" /> Create customer
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {lookup?.found && (
        <>
          {/* Remounts when the matched customer changes, so the saved address
              actually lands in the uncontrolled inputs */}
          <Card key={`${phone}-${lookup.source}`}>
            <CardContent className="space-y-4">
              <p className="font-semibold">2. Deliver to</p>
              <div className="grid gap-2">
                <Label htmlFor="o-name">Recipient name</Label>
                <Input
                  id="o-name"
                  name="name"
                  required
                  minLength={2}
                  defaultValue={lookup.address?.name || lookup.name}
                />
                <p className="text-xs text-muted-foreground">
                  Change this if the order is a gift going to someone else.
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="o-line1">Address line 1</Label>
                <Input
                  id="o-line1"
                  name="line1"
                  required
                  minLength={3}
                  defaultValue={lookup.address?.line1 ?? ""}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="o-line2">Address line 2 (optional)</Label>
                <Input id="o-line2" name="line2" defaultValue={lookup.address?.line2 ?? ""} />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="grid gap-2">
                  <Label htmlFor="o-city">City</Label>
                  <Input
                    id="o-city"
                    name="city"
                    required
                    minLength={2}
                    defaultValue={lookup.address?.city ?? ""}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="o-state">State</Label>
                  <select
                    id="o-state"
                    name="state"
                    required
                    defaultValue={lookup.address?.state || "Tamil Nadu"}
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
                  <Input
                    id="o-pin"
                    name="pincode"
                    required
                    pattern="[0-9]{6}"
                    title="6-digit pincode"
                    defaultValue={lookup.address?.pincode ?? ""}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

      <Card>
        <CardContent className="space-y-4">
          <p className="font-semibold">3. Items</p>
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
          <p className="font-semibold">4. Payment &amp; extras</p>
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
        </>
      )}
    </form>
  );
}
