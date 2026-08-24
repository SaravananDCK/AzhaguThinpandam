import type { Metadata } from "next";
import Link from "next/link";
import { IndianRupee } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDiscountConfig, getManualPaymentConfig, getShippingConfig, getSettings } from "@/lib/queries";
import { SETTINGS } from "@/lib/constants";
import { whatsappNumber } from "@/lib/upi";
import { getViewerPricing } from "@/lib/viewer";
import { formatINR } from "@/lib/money";
import { CartView } from "@/components/store/cart-view";
import { PayNow } from "@/components/store/pay-now";
import { isRazorpayConfigured } from "@/lib/razorpay";

export const metadata: Metadata = { title: "Cart" };

export default async function CartPage() {
  const [{ shippingFee, freeShippingAbove }, discount, { isEmployee }, settings, session, manual] =
    await Promise.all([
      getShippingConfig(),
      getDiscountConfig(),
      getViewerPricing(),
      getSettings(),
      auth(),
      getManualPaymentConfig(),
    ]);
  // "Order on WhatsApp" goes to the store number — the habit this replaces was
  // customers screenshotting the cart to whichever number they had (often the
  // supplier's, where it got lost).
  const waNumber = whatsappNumber(settings[SETTINGS.STORE_PHONE] ?? "");

  // A customer with an abandoned payment comes back to the cart to buy — meet
  // them with the unpaid order right there. Most recent only: checkout reuses
  // that same order, so it's the one a fresh checkout would replace anyway.
  const unpaid = session?.user?.id
    ? await prisma.order.findFirst({
        where: { userId: session.user.id, status: "PENDING" },
        orderBy: { createdAt: "desc" },
        include: { payment: true, items: { select: { qty: true } } },
      })
    : null;
  const gatewayPayable =
    !!unpaid &&
    !manual.enabled &&
    isRazorpayConfigured() &&
    !unpaid.payment?.razorpayOrderId.startsWith("SIMULATED");

  return (
    <>
      {unpaid && (
        <div className="mx-auto max-w-4xl px-4 pt-6">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border border-amber-300 bg-amber-50/60 p-4 dark:border-amber-900 dark:bg-amber-950/40">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 font-semibold">
                <IndianRupee className="size-4" /> You have an unpaid order
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                <span className="font-mono font-medium text-foreground">{unpaid.orderNumber}</span>
                {` · ${unpaid.items.reduce((s, i) => s + i.qty, 0)} ${
                  unpaid.items.reduce((s, i) => s + i.qty, 0) === 1 ? "pack" : "packs"
                } · ${formatINR(unpaid.total)} — `}
                pay it to confirm, or check out below and it&apos;ll be replaced
                with this cart.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {gatewayPayable && <PayNow orderNumber={unpaid.orderNumber} total={unpaid.total} />}
              <Link
                href={`/order/${unpaid.orderNumber}`}
                className="text-sm font-medium text-primary underline-offset-2 hover:underline"
              >
                View order
              </Link>
            </div>
          </div>
        </div>
      )}
      <CartView
        shippingFee={shippingFee}
        freeShippingAbove={freeShippingAbove}
        tiers={discount.tiers}
        discountType={discount.type}
        goodieTiers={discount.goodieTiers}
        isEmployee={isEmployee}
        whatsappNumber={waNumber}
      />
    </>
  );
}
