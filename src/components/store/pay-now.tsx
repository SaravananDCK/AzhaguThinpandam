"use client";

import { useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { IndianRupee, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/money";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

/**
 * "Pay now" for a pending order, shown on the order page when the gateway is
 * live — the escape hatch for a payment that failed or a popup that was
 * closed, so the customer never has to rebuild their cart to pay.
 */
export function PayNow({
  orderNumber,
  total,
  size = "lg",
}: {
  orderNumber: string;
  total: number;
  size?: "sm" | "lg";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function pay() {
    setBusy(true);
    try {
      const res = await fetch(`/api/orders/${orderNumber}/pay`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not start the payment.");
        setBusy(false);
        return;
      }
      // checkout.js loads afterInteractive — a click in the first second can
      // beat it. Wait briefly instead of failing a payment over a race.
      for (let waited = 0; !window.Razorpay && waited < 5000; waited += 250) {
        await new Promise((r) => setTimeout(r, 250));
      }
      if (!window.Razorpay) {
        toast.error("Payment library failed to load. Check your connection and retry.");
        setBusy(false);
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
            toast.success("Payment received — thank you!");
            router.refresh();
          } else {
            toast.error(verifyData.error ?? "Payment verification failed.");
            setBusy(false);
          }
        },
        modal: {
          ondismiss: () => {
            toast.info("Payment cancelled. Your order is saved — pay whenever you're ready.");
            setBusy(false);
          },
        },
      });
      rzp.open();
    } catch {
      toast.error("Network error. Please try again.");
      setBusy(false);
    }
  }

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
      <Button size={size} onClick={pay} disabled={busy}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : <IndianRupee className="size-4" />}
        Pay {formatINR(total)} now
      </Button>
    </>
  );
}
