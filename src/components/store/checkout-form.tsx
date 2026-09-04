"use client";

import Script from "next/script";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { Check, Loader2, Lock, Mail, MessageCircle, PartyPopper, Tag, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useCart, cartSubtotal } from "@/lib/cart-store";
import { trackFbq } from "@/lib/fbq";
import { useMounted } from "@/hooks/use-mounted";
import { useCartSync } from "@/hooks/use-cart-sync";
import { CartAdjustmentsNotice } from "@/components/store/cart-adjustments-notice";
import { formatINR } from "@/lib/money";
import {
  activeTier,
  boxDiscount,
  cartWeights,
  goodiesForKg,
  totalKg,
  type BoxTier,
} from "@/lib/box";
import type { DiscountType } from "@/lib/constants";
import type { GoodieInfo } from "@/lib/queries";
import { billableKg, computeShipping, isTamilNadu } from "@/lib/shipping";
import { INDIAN_STATES } from "@/lib/india-states";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

const RESEND_COOLDOWN_SECONDS = 30;

/** The exact body POSTed to /api/checkout, held while the customer verifies. */
type CheckoutPayload = {
  email: string;
  notes?: string;
  address: {
    name: string;
    phone: string;
    line1: string;
    line2: string;
    city: string;
    state: string;
    pincode: string;
  };
  items: { variantId: string; qty: number }[];
  couponCode?: string;
};

type Props = {
  shippingFee: number;
  freeShippingAbove: number;
  outsideTnPerKg: number;
  tiers: BoxTier[];
  discountType: DiscountType;
  goodieTiers: GoodieInfo[];
  /** Staff pay cost + ₹5/packet: no discounts, no coupons, no delivery fee. */
  isEmployee: boolean;
  defaults: Partial<
    Record<"email" | "name" | "phone" | "line1" | "line2" | "city" | "state" | "pincode", string>
  >;
  loggedIn: boolean;
  // Manual UPI settlement: the order is placed as normal, but instead of
  // opening the payment gateway the customer gets UPI + WhatsApp instructions.
  manualPayment: boolean;
  // Banner copy shown while manual payment is on (store-configurable).
  notice?: string;
};

export function CheckoutForm({
  shippingFee,
  freeShippingAbove,
  outsideTnPerKg,
  tiers,
  discountType,
  goodieTiers,
  isEmployee,
  defaults,
  loggedIn,
  manualPayment,
  notice,
}: Props) {
  const router = useRouter();
  const { items, clear } = useCart();
  const mounted = useMounted();
  // Catch a stale cart here too — someone can land on checkout directly
  const { adjustments, dismiss } = useCartSync(mounted);
  const [submitting, setSubmitting] = useState(false);
  // Controlled so shipping recalculates as the customer picks their state
  const [state, setState] = useState(defaults.state ?? "");
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [couponMsg, setCouponMsg] = useState<string | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  // Inline OTP gate — guests verify their mobile (or email, for customers
  // abroad without an Indian number) in a dialog on submit, then the held
  // payload continues straight to /api/checkout. Never a redirect to /login:
  // that would throw away everything they just typed.
  const [authed, setAuthed] = useState(loggedIn);
  const [otpOpen, setOtpOpen] = useState(false);
  const [otpStep, setOtpStep] = useState<"phone" | "code">("phone");
  const [otpChannel, setOtpChannel] = useState<"phone" | "email">("phone");
  const [otpPhone, setOtpPhone] = useState("");
  const [otpEmail, setOtpEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpBusy, setOtpBusy] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [resendWait, setResendWait] = useState(0);
  const pendingRef = useRef<CheckoutPayload | null>(null);

  // Resend cooldown, counted down a second at a time — no timer runs once it
  // hits zero, so there is no permanent interval on the page.
  useEffect(() => {
    if (resendWait <= 0) return;
    const t = setTimeout(() => setResendWait((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendWait]);

  const subtotal = cartSubtotal(items);
  // Mirrors the server-side math in createOrderFromCart
  // Mirrors priceOrderLines: shipping weighs the whole parcel, the bundle
  // discount only looks at snacks.
  const { shippingKg: weightKg, foodKg, foodSubtotal } = cartWeights(items);
  // Staff already buy at cost + ₹5/packet, so no reward stacks on top and the
  // coupon box is hidden entirely — mirrors the server's isEmployee branch.
  const percentMode = !isEmployee && discountType === "percent";
  const tier = percentMode ? activeTier(tiers, foodKg) : null;
  const boxDisc = percentMode ? boxDiscount(tiers, foodKg, foodSubtotal) : 0;
  // Whichever is larger — coupon or box discount, never both. In goodies mode
  // boxDisc is 0, so any valid coupon wins (and replaces the goodies).
  const couponDisc = isEmployee ? 0 : (coupon?.discount ?? 0);
  const couponWins = couponDisc > boxDisc;
  const discount = Math.max(boxDisc, couponDisc);
  const discounted = subtotal - discount;
  // Goodies mode mirror of priceOrderLines: free items from the highest
  // reached tier, suppressed by a winning coupon (one benefit per order).
  const activeGoodies =
    isEmployee || percentMode
      ? []
      : goodiesForKg(goodieTiers.filter((g) => g.available), foodKg);
  const goodiesApply = activeGoodies.length > 0 && !couponWins;
  // Goodies ride in the parcel, so they count toward the shipping weight.
  const parcelKg =
    weightKg +
    (goodiesApply
      ? totalKg(
          activeGoodies.map((g) => ({
            label: g.variantLabel,
            qty: g.qty,
            weightGrams: g.weightGrams,
          }))
        )
      : 0);
  // Mirrors createOrderFromCart: inside TN flat/free-above, outside TN weight × ₹/kg
  const stateChosen = state.trim().length > 0;
  const outsideTn = !isEmployee && stateChosen && !isTamilNadu(state);
  // Staff collect at the shop — never a delivery charge.
  const fee =
    stateChosen && !isEmployee
      ? computeShipping({
          state,
          weightKg: parcelKg,
          subtotal: discounted,
          config: { shippingFee, freeShippingAbove, outsideTnPerKg },
        })
      : 0;
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
        // No phone: per-customer limits are checked against the verified
        // session on the server, not against anything we send from here.
        body: JSON.stringify({ code, subtotal }),
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

  // Meta Pixel: the cart reached checkout. Once per visit — editing a quantity
  // or applying a coupon here is the same checkout, not a second one. Waits for
  // `mounted` because the cart is only real once the persisted store hydrates.
  const checkoutTracked = useRef(false);
  useEffect(() => {
    if (!mounted || checkoutTracked.current || items.length === 0) return;
    checkoutTracked.current = true;
    trackFbq("InitiateCheckout", {
      content_type: "product",
      content_ids: items.map((i) => i.variantId),
      contents: items.map((i) => ({
        id: i.variantId,
        quantity: i.qty,
        item_price: i.price / 100,
      })),
      num_items: items.reduce((n, i) => n + i.qty, 0),
      // Cart subtotal: shipping, coupons and the weight discount are all still
      // in flux on this page, and only Purchase reports what was really paid.
      value: cartSubtotal(items) / 100,
      currency: "INR",
    });
  }, [mounted, items]);

  if (!mounted || items.length === 0) return <div className="py-12" />;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload: CheckoutPayload = {
      email: String(form.get("email") ?? ""),
      notes: (form.get("notes") as string) || undefined,
      address: {
        name: String(form.get("name") ?? ""),
        phone: String(form.get("phone") ?? ""),
        line1: String(form.get("line1") ?? ""),
        line2: String(form.get("line2") ?? ""),
        city: String(form.get("city") ?? ""),
        state: String(form.get("state") ?? ""),
        pincode: String(form.get("pincode") ?? ""),
      },
      items: items.map((i) => ({ variantId: i.variantId, qty: i.qty })),
      // Only send the coupon when it actually beats the box discount, so a
      // non-winning (or stale) code never blocks checkout. Staff never send one
      // — the server ignores codes for them anyway.
      couponCode: !isEmployee && couponWins ? coupon?.code : undefined,
    };

    // Guests verify first. The delivery number they just typed is the default,
    // so most people only have to enter the code.
    if (!authed) {
      pendingRef.current = payload;
      setOtpPhone(payload.address.phone);
      setOtpEmail(payload.email);
      setOtpCode("");
      setOtpStep("phone");
      setDevCode(null);
      setOtpOpen(true);
      // On the email channel there may be no address to send to — the contact
      // email is optional. Open on the identifier step and let them type one.
      const identifier = otpChannel === "phone" ? payload.address.phone : payload.email;
      if (identifier) await sendOtp(identifier);
      return;
    }

    await placeOrder(payload);
  }

  /** Requests a code; stays on the identifier step so they can retry if it fails. */
  async function sendOtp(identifier: string) {
    setOtpBusy(true);
    try {
      const res = await fetch("/api/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          otpChannel === "phone" ? { phone: identifier } : { email: identifier }
        ),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not send the code.");
        return;
      }
      setDevCode(data.devCode ?? null);
      setResendWait(RESEND_COOLDOWN_SECONDS);
      setOtpStep("code");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setOtpBusy(false);
    }
  }

  /**
   * Re-prices the coupon now that the phone is verified — the preview ran
   * without a session, so this is the first real per-customer check. Returns
   * the discount, or null if the code is no longer usable.
   */
  async function recheckCoupon(code: string): Promise<number | null> {
    try {
      const res = await fetch("/api/coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, subtotal }),
      });
      const data = await res.json();
      if (!data.valid) {
        setCoupon(null);
        setCouponInput("");
        setCouponMsg(data.error ?? "This coupon isn't valid.");
        toast.error(data.error ?? "This coupon isn't valid.");
        return null;
      }
      setCoupon({ code: data.code, discount: data.discount });
      return data.discount as number;
    } catch {
      toast.error("Couldn't re-check the coupon. Please try again.");
      return null;
    }
  }

  async function handleOtpVerify(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setOtpBusy(true);
    const res = await signIn(otpChannel === "phone" ? "phone-otp" : "email-otp", {
      ...(otpChannel === "phone" ? { phone: otpPhone } : { email: otpEmail }),
      code: otpCode,
      redirect: false,
    });
    if (res?.error) {
      toast.error("Incorrect or expired code. Please try again.");
      setOtpBusy(false);
      return;
    }
    setAuthed(true);
    setOtpOpen(false);
    setOtpBusy(false);

    const payload = pendingRef.current;
    pendingRef.current = null;
    if (!payload) return;

    // First-ever login: the checkout form already has their name and email, so
    // fill the profile from it instead of asking again. On the email channel
    // never post the contact email — the login email is OTP-verified and the
    // contact field is free-typed; "" tells the profile route to leave it.
    try {
      const session = await fetch("/api/auth/session").then((r) => r.json());
      if (!session?.user?.name) {
        await fetch("/api/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: payload.address.name,
            email: otpChannel === "email" ? "" : payload.email,
          }),
        });
      }
    } catch {
      // Never block the order on profile completion
    }

    if (payload.couponCode) {
      const discountNow = await recheckCoupon(payload.couponCode);
      if (discountNow === null) return; // dead code — let them re-check the total
      // Bundle discount may now be the better deal; don't send a losing coupon.
      if (discountNow <= boxDisc) payload.couponCode = undefined;
    }

    await placeOrder(payload);
  }

  async function placeOrder(payload: CheckoutPayload) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        // Session expired between verifying and paying — verify again. The
        // channel the customer chose persists across the re-open.
        if (res.status === 401 && data.needsAuth) {
          setAuthed(false);
          pendingRef.current = payload;
          setOtpPhone(payload.address.phone);
          setOtpEmail(payload.email);
          setOtpCode("");
          setOtpStep("phone");
          setDevCode(null);
          setSubmitting(false);
          setOtpOpen(true);
          const identifier = otpChannel === "phone" ? payload.address.phone : payload.email;
          if (identifier) await sendOtp(identifier);
          return;
        }
        toast.error(data.error ?? "Could not place the order.");
        setSubmitting(false);
        return;
      }

      // Manual UPI settlement, or the dev fallback without Razorpay keys —
      // either way the order exists and there is no gateway to open.
      if (data.manualPayment || data.simulated) {
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
        name: "Azhagu Thinpandam",
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
            // The order exists and is pending — checking out again picks it
            // back up rather than starting a second one.
            toast.info("Payment cancelled. Your cart is saved — you can try again.");
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

      <div className="mt-6">
        <CartAdjustmentsNotice adjustments={adjustments} onDismiss={dismiss} />
      </div>

      {manualPayment && notice && (
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-100">
          <PartyPopper className="mt-0.5 size-5 shrink-0" />
          <p className="text-sm leading-relaxed">{notice}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 grid gap-6 md:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          <Card>
            <CardContent className="space-y-4">
              <p className="font-semibold">Contact</p>
              <div className="grid gap-2">
                <Label htmlFor="email">
                  Email <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={defaults.email}
                  placeholder="you@example.com"
                />
                {!authed && (
                  <p className="text-xs text-muted-foreground">
                    We&apos;ll WhatsApp a one-time code to your mobile number to
                    confirm the order — no password needed. Add an email only if
                    you&apos;d also like the confirmation by mail.
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
                  <select
                    id="state"
                    name="state"
                    required
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="h-9 rounded-md border bg-background px-2 text-sm"
                  >
                    <option value="" disabled>
                      Select state…
                    </option>
                    {INDIAN_STATES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
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

            {isEmployee && (
              <p className="rounded-lg border border-gold-300 bg-gold-50 px-2.5 py-2 text-xs text-gold-900 dark:border-gold-800 dark:bg-gold-950/50 dark:text-gold-200">
                <strong>Staff pricing</strong> — cost + ₹5 per packet. No bundle
                discount, coupons or delivery charge; collect at the shop.
              </p>
            )}

            {/* Coupon — staff prices already sit at cost, so no codes apply */}
            {isEmployee ? null : coupon ? (
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
            {!coupon && activeGoodies.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Note: applying a coupon replaces your free goodies — one offer per order.
              </p>
            )}

            {/* Free goodies (or the note that a coupon displaced them) */}
            {goodiesApply && (
              <div className="space-y-1 rounded-lg border border-green-200 bg-green-50 px-2.5 py-2 text-sm dark:border-green-900 dark:bg-green-950/50">
                <p className="flex items-center gap-1.5 font-medium text-green-700 dark:text-green-300">
                  <PartyPopper className="size-4 shrink-0" /> Free goodies with your order
                </p>
                {activeGoodies.map((g) => (
                  <div
                    key={`${g.variantId}-${g.kg}`}
                    className="flex justify-between text-xs text-green-800 dark:text-green-300"
                  >
                    <span>
                      {g.productName} ({g.variantLabel}){g.qty > 1 ? ` × ${g.qty}` : ""}
                    </span>
                    <span className="font-semibold">FREE</span>
                  </div>
                ))}
              </div>
            )}
            {activeGoodies.length > 0 && couponWins && (
              <p className="text-xs text-muted-foreground">
                Coupon {coupon?.code} applied — free goodies are skipped (one offer per
                order). Remove the coupon to get the goodies instead.
              </p>
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
              <span className="font-medium">
                {isEmployee ? "FREE" : !stateChosen ? "—" : fee === 0 ? "FREE" : formatINR(fee)}
              </span>
            </div>
            {isEmployee ? (
              <p className="text-xs text-muted-foreground">
                Staff order — no delivery charge; collect at the shop.
              </p>
            ) : !stateChosen ? (
              <p className="text-xs text-muted-foreground">
                Select your delivery state to see the shipping charge.
              </p>
            ) : outsideTn ? (
              <p className="text-xs text-muted-foreground">
                Outside Tamil Nadu — charged by weight: {billableKg(parcelKg)} kg ×{" "}
                {formatINR(outsideTnPerKg)}/kg (rounded up to the next kg
                {goodiesApply ? ", free goodies included" : ""}).
              </p>
            ) : (
              fee > 0 &&
              freeShippingAbove > 0 && (
                <p className="text-xs text-muted-foreground">
                  Free shipping within Tamil Nadu on{" "}
                  {discount > 0 ? "the after-discount total" : "orders"} above{" "}
                  {formatINR(freeShippingAbove)}
                </p>
              )
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
                  <Lock className="size-4" />
                  {authed ? "" : "Verify & "}
                  {manualPayment ? "Place order" : "Pay"} {formatINR(total)}
                </>
              )}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              {manualPayment
                ? "Pay by UPI after placing the order — instructions come next"
                : "Secure payments — UPI, cards, netbanking & wallets"}
            </p>
          </CardContent>
        </Card>
      </form>

      {/* Inline mobile verification — holds the order until the code checks out */}
      <Dialog
        open={otpOpen}
        onOpenChange={(open) => {
          setOtpOpen(open);
          // Abandoning the dialog must not leave a payload primed to fire
          if (!open) pendingRef.current = null;
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader className="items-center text-center">
            <span className="mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              {otpChannel === "phone" ? (
                <MessageCircle className="size-6" />
              ) : (
                <Mail className="size-6" />
              )}
            </span>
            <DialogTitle className="font-heading text-lg">
              {otpStep !== "phone"
                ? "Enter the code"
                : otpChannel === "phone"
                  ? "Confirm your mobile number"
                  : "Confirm your email"}
            </DialogTitle>
          </DialogHeader>

          {otpStep === "phone" ? (
            <form
              key={otpChannel === "phone" ? "otp-phone" : "otp-email"}
              onSubmit={(e) => {
                e.preventDefault();
                sendOtp(otpChannel === "phone" ? otpPhone : otpEmail);
              }}
              className="space-y-4"
            >
              {otpChannel === "phone" ? (
                <div className="grid gap-2">
                  <Label htmlFor="otp-phone">Mobile number</Label>
                  <Input
                    id="otp-phone"
                    type="tel"
                    inputMode="numeric"
                    required
                    autoComplete="tel"
                    value={otpPhone}
                    onChange={(e) => setOtpPhone(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    We&apos;ll send a one-time code here to confirm your order.
                  </p>
                </div>
              ) : (
                <div className="grid gap-2">
                  <Label htmlFor="otp-email">Email address</Label>
                  <Input
                    id="otp-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={otpEmail}
                    onChange={(e) => setOtpEmail(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    We&apos;ll email a one-time code to confirm your order.
                  </p>
                </div>
              )}
              <Button type="submit" className="w-full" disabled={otpBusy}>
                {otpBusy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : otpChannel === "phone" ? (
                  <MessageCircle className="size-4" />
                ) : (
                  <Mail className="size-4" />
                )}
                {otpChannel === "phone" ? "Send code on WhatsApp" : "Email me a code"}
              </Button>
              <p className="text-center text-xs">
                <button
                  type="button"
                  className="text-muted-foreground hover:underline"
                  onClick={() => {
                    setOtpChannel((c) => (c === "phone" ? "email" : "phone"));
                    setOtpCode("");
                    setDevCode(null);
                  }}
                >
                  {otpChannel === "phone"
                    ? "Can't receive WhatsApp codes? Use your email instead"
                    : "← Use mobile number instead"}
                </button>
              </p>
            </form>
          ) : (
            <form key="otp-code" onSubmit={handleOtpVerify} className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="otp-code">6-digit code</Label>
                <Input
                  id="otp-code"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  required
                  autoComplete="one-time-code"
                  autoFocus
                  className="text-center text-lg tracking-[0.5em]"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {otpChannel === "phone" ? (
                    <>
                      Sent via WhatsApp to <span className="font-medium">{otpPhone}</span>
                    </>
                  ) : (
                    <>
                      Sent to <span className="font-medium">{otpEmail}</span> —
                      check spam if you don&apos;t see it
                    </>
                  )}
                  .{" "}
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() => {
                      setOtpStep("phone");
                      setOtpCode("");
                      setDevCode(null);
                    }}
                  >
                    {otpChannel === "phone" ? "Change number" : "Change email"}
                  </button>
                </p>
                {devCode && (
                  <p className="rounded-md bg-amber-100 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                    Dev mode ({otpChannel === "phone" ? "WhatsApp" : "SMTP"} not
                    configured) — your code is{" "}
                    <span className="font-mono font-bold">{devCode}</span>
                  </p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={otpBusy}>
                {otpBusy ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
                {manualPayment ? "Verify & place order" : "Verify & continue to payment"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Didn&apos;t get it?{" "}
                {otpChannel === "email" && (
                  <>
                    Check your <strong>junk/spam</strong> folder, or{" "}
                  </>
                )}
                <button
                  type="button"
                  className="text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={otpBusy || resendWait > 0}
                  onClick={() => sendOtp(otpChannel === "phone" ? otpPhone : otpEmail)}
                >
                  {resendWait > 0 ? `Resend in ${resendWait}s` : "Resend code"}
                </button>
              </p>
            </form>
          )}
        </DialogContent>
      </Dialog>

    </>
  );
}
