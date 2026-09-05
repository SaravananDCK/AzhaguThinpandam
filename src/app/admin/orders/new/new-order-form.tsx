"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { Check, Loader2, Plus, Search, Trash2, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatINR } from "@/lib/money";
import { INDIAN_STATES } from "@/lib/india-states";
import type { CustomerCandidate, CustomerLookup } from "@/lib/admin-orders";
import { createAdminOrder, findCustomerByPhone, findCustomers } from "../actions";

type Variant = {
  id: string;
  label: string;
  price: number;
  stock: number;
  madeToOrder: boolean;
};
type Line = { variantId: string; qty: number };

/** The typed text as a 10-digit Indian mobile, or null if it isn't one. */
function normalizeTyped(raw: string): string | null {
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

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
  // customer who turns out not to exist. The number is rarely what the admin
  // has to hand, so the box searches name, part of a number, email and order
  // number; the full lookup (which carries the saved address) runs once one of
  // the matches is picked.
  const [query, setQuery] = useState(initialPhone);
  const [phone, setPhone] = useState(initialPhone);
  const [lookup, setLookup] = useState<CustomerLookup | null>(initialLookup);
  const [looking, setLooking] = useState(false);
  // Keyed by the query they answer, so results from a stale keystroke are never
  // shown against newer text (and no effect has to clear them)
  const [results, setResults] = useState<{ q: string; items: CustomerCandidate[] } | null>(null);

  const trimmed = query.trim();
  const typedNumber = normalizeTyped(query);
  const shown = results && results.q === trimmed ? results.items : null;
  const searching = !lookup?.found && trimmed.length >= 2 && shown === null;

  const selectCustomer = useCallback(async (value: string) => {
    setPhone(value);
    setQuery(value);
    setResults(null);
    setLooking(true);
    try {
      const found = await findCustomerByPhone(value);
      // Only a race (deleted between search and click) lands here
      if (!found.found) {
        toast.error("That customer is no longer on file.");
        setLookup(null);
        return;
      }
      setLookup(found);
    } catch {
      toast.error("Could not load that customer.");
    } finally {
      setLooking(false);
    }
  }, []);

  useEffect(() => {
    const q = query.trim();
    // `looking` guard: a pick already in flight must not trigger a fresh search
    if (looking || lookup?.found || q.length < 2) return;
    let cancelled = false;
    // Debounced so a name typed at speed is one query, not one per keystroke
    const timer = setTimeout(async () => {
      try {
        const found = await findCustomers(q);
        if (cancelled) return;
        // A complete number typed in full has only one sensible answer — skip
        // the extra click and match them straight away.
        const exact = normalizeTyped(q);
        if (exact && found.length === 1 && found[0].phone === exact) {
          selectCustomer(exact);
          return;
        }
        setResults({ q, items: found });
      } catch {
        if (cancelled) return;
        toast.error("Could not search customers.");
        setResults({ q, items: [] });
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, looking, lookup?.found, selectCustomer]);

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

          {lookup?.found ? (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm dark:border-green-900 dark:bg-green-950/50">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 font-medium text-green-800 dark:text-green-200">
                    <Check className="size-4" /> {lookup.name || "Existing customer"}
                  </p>
                  <p className="mt-1 text-xs text-green-800/80 dark:text-green-200/80">
                    {phone} ·{" "}
                    {lookup.email ? `${lookup.email} · ` : "No email on file · "}
                    {lookup.orderCount} previous order{lookup.orderCount === 1 ? "" : "s"}
                    {lookup.source === "orders" &&
                      " · from earlier orders — no account yet, one will be created"}
                    {lookup.address && ". Their saved address is filled in below."}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setLookup(null);
                    setPhone("");
                    setQuery("");
                  }}
                >
                  <X className="size-4" /> Change
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="grid gap-2">
                <Label htmlFor="o-search">Find the customer</Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="o-search"
                    className="pl-9"
                    autoComplete="off"
                    placeholder="Name, mobile number, email or order number"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                      // Nothing to submit yet — Enter would post the form
                      if (e.key === "Enter") e.preventDefault();
                    }}
                  />
                  {(searching || looking) && (
                    <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Searches accounts and past orders — part of a name or number is
                  enough.
                </p>
              </div>

              {shown !== null && shown.length > 0 && (
                <ul className="divide-y rounded-lg border">
                  {shown.map((c) => (
                    <li key={c.phone}>
                      <button
                        type="button"
                        onClick={() => selectCustomer(c.phone)}
                        className="flex w-full items-center justify-between gap-3 p-3 text-left text-sm hover:bg-accent"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium">
                            {c.name || "Unnamed customer"}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {c.phone}
                            {c.email && ` · ${c.email}`}
                            {c.matchedOrder && ` · order ${c.matchedOrder}`}
                          </span>
                        </span>
                        <span className="shrink-0 text-right text-xs text-muted-foreground">
                          <span className="block">
                            {c.orderCount} order{c.orderCount === 1 ? "" : "s"}
                          </span>
                          {c.source === "orders" && <span className="block">no account yet</span>}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {shown !== null && shown.length === 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/50">
                  <p className="font-medium text-amber-900 dark:text-amber-100">
                    No customer found for &ldquo;{query.trim()}&rdquo;
                  </p>
                  <p className="mt-1 text-xs text-amber-900/80 dark:text-amber-100/80">
                    {typedNumber
                      ? "Create them first — you'll come straight back here with the number filled in."
                      : "Try part of their name, mobile number or an order number. If they're new, create them first — you'll come straight back here."}
                  </p>
                  <Button asChild size="sm" variant="outline" className="mt-2">
                    <Link
                      href={`/admin/customers/new?next=/admin/orders/new${
                        typedNumber ? `&phone=${encodeURIComponent(typedNumber)}` : ""
                      }`}
                    >
                      <UserPlus className="size-4" /> Create customer
                    </Link>
                  </Button>
                </div>
              )}
            </>
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
                          {v.label} — {formatINR(v.price)}{" "}
                          {v.madeToOrder ? "(made to order)" : `(${v.stock} in stock)`}
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
            Bundle discount or free goodies, and shipping, are added when you
            save, using the same rules as the website — the final total appears
            on the order. Prices listed here are retail; a staff customer is
            re-priced at cost + ₹5 per packet when the order is saved.
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
