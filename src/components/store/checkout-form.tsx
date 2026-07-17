"use client";

import Script from "next/script";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Check, Loader2, Lock, Tag, X } from "lucide-react";
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
import { activeTier, boxDiscount, totalKg, type BoxTier } from "@/lib/box";

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
  const phoneRef = useRef<HTMLInputElement>(null);
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [couponMsg, setCouponMsg] = useState<string | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  const subtotal = cartSubtotal(items);
  // Mirrors the server-side math in createOrderFromCart
  const weightKg = totalKg(items.map((i) => ({ label: i.variantLabel, qty: i.qty })));
  const tier = activeTier(tiers, weightKg);
  const boxDisc = boxDiscount(tiers, weightKg, subtotal);
  // Whichever is larger — coupon or box discount, never both.
  const couponDisc = coupon?.discount ?? 0;
  const couponWins = couponDisc > boxDisc;
  const discount = Math.max(boxDisc, couponDisc);
  const discounted = subtotal - discount;
  const fee = freeShippingAbove > 0 && discounted >= freeShippingAbove ? 0 : shippingFee;
  const total = discounted + fee;

  async function applyCoupon() {
    const code = couponInput.trim();
    if (!code) return;
    setApplyingCoupon(true);
    setCouponMsg(null);
    try {
      const res = await fetch("/api/coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, subtotal, phone: phoneRef.current?.value?.trim() ?? "" }),
      });
      const data = await res.json();
      if (!data.valid) {
        setCoupon(null);
        setCouponMsg(data.error ?? "This coupon isn't valid.");
      } else {
        setCoupon({ code: data.code, discount: data.discount });
        setCouponMsg(
          data.discount <= boxDisc
            ? "Your bundle discount is already bigger, so that will be applied."
            : null
        );
      }
    } catch {
      setCouponMsg("Couldn't check the coupon. Please try again.");
    } finally {
      setApplyingCoupon(false);
    }
  }

  function removeCoupon() {
    setCoupon(null);
    setCouponInput("");
    setCouponMsg(null);
  }

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
          // Only send the coupon when it actually beats the box discount, so a
          // non-winning (or stale) code never blocks checkout.
          couponCode: couponWins ? coupon?.code : undefined,
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
                    ref={phoneRef}
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

            {/* Coupon */}
            {coupon ? (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-green-200 bg-green-50 px-2.5 py-2 text-sm dark:border-green-900 dark:bg-green-950/50">
                <span className="flex items-center gap-1.5 font-medium text-green-700 dark:text-green-300">
                  <Check className="size-4 shrink-0" /> {coupon.code}
                </span>
                <button
                  type="button"
                  onClick={removeCoupon}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Remove coupon"
                >
                  <X className="size-4" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        applyCoupon();
                      }
                    }}
                    placeholder="Coupon code"
                    className="h-9 pl-8 uppercase"
                    aria-label="Coupon code"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9"
                  onClick={applyCoupon}
                  disabled={applyingCoupon || !couponInput.trim()}
                >
                  {applyingCoupon ? <Loader2 className="size-4 animate-spin" /> : "Apply"}
                </Button>
              </div>
            )}
            {couponMsg && (
              <p className="text-xs text-muted-foreground">{couponMsg}</p>
            )}

            {discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {couponWins
                    ? `Coupon (${coupon?.code})`
                    : `Bundle discount${tier ? ` (${tier.percent}%)` : ""}`}
                </span>
                <span className="font-semibold text-green-600 dark:text-green-400">
                  −{formatINR(discount)}
                </span>
              </div>
            )}
            {discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">After discount</span>
                <span className="font-medium">{formatINR(discounted)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Shipping</span>
              <span className="font-medium">{fee === 0 ? "FREE" : formatINR(fee)}</span>
            </div>
            {fee > 0 && freeShippingAbove > 0 && (
              <p className="text-xs text-muted-foreground">
                Free shipping on {discount > 0 ? "the after-discount total" : "orders"} above{" "}
                {formatINR(freeShippingAbove)}
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
