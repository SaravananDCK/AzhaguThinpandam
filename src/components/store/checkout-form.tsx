"use client";

import Script from "next/script";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useCart, cartSubtotal } from "@/lib/cart-store";
import { useMounted } from "@/hooks/use-mounted";
import { formatINR } from "@/lib/money";
import { activeTier, boxDiscount, type BoxTier } from "@/lib/box";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

type Props = {
  shippingFee: number;
  freeShippingAbove: number;
  tiers: BoxTier[];
  defaults: Partial<
    Record<"email" | "name" | "phone" | "line1" | "line2" | "city" | "state" | "pincode", string>
  >;
  loggedIn: boolean;
};

export function CheckoutForm({ shippingFee, freeShippingAbove, tiers, defaults, loggedIn }: Props) {
  const router = useRouter();
  const { items, clear } = useCart();
  const mounted = useMounted();
  const [submitting, setSubmitting] = useState(false);

  const subtotal = cartSubtotal(items);
  // Mirrors the server-side math in createOrderFromCart
  const packCount = items.reduce((sum, i) => sum + i.qty, 0);
  const tier = activeTier(tiers, packCount);
  const discount = boxDiscount(tiers, packCount, subtotal);
  const discounted = subtotal - discount;
  const fee = freeShippingAbove > 0 && discounted >= freeShippingAbove ? 0 : shippingFee;
  const total = discounted + fee;

  useEffect(() => {
    if (mounted && items.length === 0 && !submitting) router.replace("/cart");
  }, [mounted, items.length, submitting, router]);

  if (!mounted || items.length === 0) return <div className="py-12" />;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setSubmitting(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          notes: form.get("notes") || undefined,
          address: {
            name: form.get("name"),
            phone: form.get("phone"),
            line1: form.get("line1"),
            line2: form.get("line2") || "",
            city: form.get("city"),
            state: form.get("state"),
            pincode: form.get("pincode"),
          },
          items: items.map((i) => ({ variantId: i.variantId, qty: i.qty })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not place the order.");
        setSubmitting(false);
        return;
      }

      // Dev fallback without Razorpay keys — order marked paid on the server
      if (data.simulated) {
        clear();
        router.push(`/order/${data.orderNumber}?placed=1`);
        return;
      }

      if (!window.Razorpay) {
        toast.error("Payment library failed to load. Check your connection and retry.");
        setSubmitting(false);
        return;
      }

      const rzp = new window.Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: "AzhaguThinpandam",
        description: `Order ${data.orderNumber}`,
        order_id: data.razorpayOrderId,
        prefill: { name: data.name, email: data.email, contact: data.phone },
        theme: { color: "#8f1e1e" },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          const verifyRes = await fetch("/api/checkout/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(response),
          });
          const verifyData = await verifyRes.json();
          if (verifyRes.ok) {
            clear();
            router.push(`/order/${verifyData.orderNumber}?placed=1`);
          } else {
            toast.error(verifyData.error ?? "Payment verification failed.");
            setSubmitting(false);
          }
        },
        modal: {
          ondismiss: () => {
            toast.info("Payment cancelled. Your order was not placed.");
            setSubmitting(false);
          },
        },
      });
      rzp.open();
    } catch {
      toast.error("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
      <form onSubmit={handleSubmit} className="mt-6 grid gap-6 md:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          <Card>
            <CardContent className="space-y-4">
              <p className="font-semibold">Contact</p>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  defaultValue={defaults.email}
                  placeholder="you@example.com"
                />
                {!loggedIn && (
                  <p className="text-xs text-muted-foreground">
                    Your order confirmation is sent here. Have an account?{" "}
                    <a href="/login?callbackUrl=/checkout" className="text-primary hover:underline">
                      Log in
                    </a>
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4">
              <p className="font-semibold">Delivery Address</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="name">Full name</Label>
                  <Input id="name" name="name" required defaultValue={defaults.name} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Mobile number</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    required
                    pattern="[6-9][0-9]{9}"
                    title="10-digit mobile number"
                    defaultValue={defaults.phone}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="line1">Address line 1</Label>
                <Input
                  id="line1"
                  name="line1"
                  required
                  defaultValue={defaults.line1}
                  placeholder="House no, street"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="line2">Address line 2 (optional)</Label>
                <Input
                  id="line2"
                  name="line2"
                  defaultValue={defaults.line2}
                  placeholder="Area, landmark"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="grid gap-2">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" name="city" required defaultValue={defaults.city} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="state">State</Label>
                  <Input id="state" name="state" required defaultValue={defaults.state} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="pincode">Pincode</Label>
                  <Input
                    id="pincode"
                    name="pincode"
                    required
                    pattern="[0-9]{6}"
                    title="6-digit pincode"
                    defaultValue={defaults.pincode}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="notes">Order notes (optional)</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  rows={2}
                  placeholder="Delivery instructions, gift message…"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardContent className="space-y-3">
            <p className="font-semibold">Order Summary</p>
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.variantId} className="flex justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">
                    {item.productName} ({item.variantLabel}) × {item.qty}
                  </span>
                  <span className="shrink-0 font-medium">
                    {formatINR(item.price * item.qty)}
                  </span>
                </div>
              ))}
            </div>
            <Separator />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">{formatINR(subtotal)}</span>
            </div>
            {discount > 0 && tier && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Bundle discount ({tier.percent}%)</span>
                <span className="font-semibold text-green-600 dark:text-green-400">
                  −{formatINR(discount)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Shipping</span>
              <span className="font-medium">{fee === 0 ? "FREE" : formatINR(fee)}</span>
            </div>
            {fee > 0 && freeShippingAbove > 0 && (
              <p className="text-xs text-muted-foreground">
                Free shipping on orders above {formatINR(freeShippingAbove)}
              </p>
            )}
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>{formatINR(total)}</span>
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Processing…
                </>
              ) : (
                <>
                  <Lock className="size-4" /> Pay {formatINR(total)}
                </>
              )}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Secured by Razorpay — UPI, cards, netbanking & wallets
            </p>
          </CardContent>
        </Card>
      </form>
    </>
  );
}
