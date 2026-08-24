import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDiscountConfig, getManualPaymentConfig, getShippingConfig } from "@/lib/queries";
import { getViewerPricing } from "@/lib/viewer";
import { CheckoutForm } from "@/components/store/checkout-form";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const [session, shippingConfig, discount, manual, { isEmployee }] = await Promise.all([
    auth(),
    getShippingConfig(),
    getDiscountConfig(),
    getManualPaymentConfig(),
    getViewerPricing(),
  ]);

  // Login before typing, not after: a returning customer gets their saved
  // address prefilled instead of retyping it and only then being asked to
  // verify. The form's own inline OTP stays as the fallback for a session
  // that expires between here and "Verify & Pay".
  if (!session?.user?.id) redirect("/login?callbackUrl=/checkout");

  let defaults: {
    email?: string;
    name?: string;
    phone?: string;
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    pincode?: string;
  } = {};

  if (session?.user?.id) {
    const address = await prisma.address.findFirst({
      where: { userId: session.user.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
    defaults = {
      email: session.user.email ?? undefined,
      name: address?.name ?? session.user.name ?? undefined,
      phone: address?.phone ?? session.user.phone ?? undefined,
      line1: address?.line1,
      line2: address?.line2 ?? undefined,
      city: address?.city,
      state: address?.state,
      pincode: address?.pincode,
    };
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="font-heading text-2xl font-bold sm:text-3xl">Checkout</h1>
      <CheckoutForm
        shippingFee={shippingConfig.shippingFee}
        freeShippingAbove={shippingConfig.freeShippingAbove}
        outsideTnPerKg={shippingConfig.outsideTnPerKg}
        tiers={discount.tiers}
        discountType={discount.type}
        goodieTiers={discount.goodieTiers}
        isEmployee={isEmployee}
        defaults={defaults}
        loggedIn={Boolean(session?.user)}
        manualPayment={manual.enabled}
        notice={manual.notice}
      />
    </div>
  );
}
