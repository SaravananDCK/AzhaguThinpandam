import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBoxTiers, getManualPaymentConfig, getShippingConfig } from "@/lib/queries";
import { CheckoutForm } from "@/components/store/checkout-form";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const [session, shippingConfig, tiers, manual] = await Promise.all([
    auth(),
    getShippingConfig(),
    getBoxTiers(),
    getManualPaymentConfig(),
  ]);

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
        tiers={tiers}
        defaults={defaults}
        loggedIn={Boolean(session?.user)}
        manualPayment={manual.enabled}
        notice={manual.notice}
      />
    </div>
  );
}
