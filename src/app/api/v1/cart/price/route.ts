import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { CheckoutError, priceOrderLines } from "@/lib/orders";
import { getCurrentUser } from "@/lib/api-auth";
import { MAX_LINE_QTY } from "@/lib/availability";
import { absoluteUrl, apiOrigin } from "@/lib/api-serialize";
import { logError } from "@/lib/log";

// What this cart would cost, worked out by the same code that prices the real
// order (priceOrderLines) — so the total the app shows is the total checkout
// charges. Works signed-out too; a signed-in customer gets their own coupon
// limits and, for staff, staff prices.

const schema = z.object({
  items: z
    .array(
      z.object({
        variantId: z.string().min(1),
        qty: z.number().int().min(1).max(MAX_LINE_QTY),
      })
    )
    .min(1)
    .max(50),
  /** Delivery state — decides the delivery charge and the pre-order cutoff */
  state: z.string().trim().min(2).max(100),
  couponCode: z.string().trim().max(40).optional().or(z.literal("")),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid cart." }, { status: 400 });
  }
  const origin = apiOrigin(req);

  try {
    const viewer = await getCurrentUser();
    // Staff pricing comes from the user record, never from the request
    const isEmployee = viewer
      ? ((await prisma.user.findUnique({
          where: { id: viewer.id },
          select: { isEmployee: true },
        }))?.isEmployee ?? false)
      : false;

    const priced = await priceOrderLines({
      items: parsed.data.items,
      state: parsed.data.state,
      couponCode: parsed.data.couponCode || undefined,
      // Verified identity only. Signed out it is "", which previews the coupon
      // without the per-customer limit — checkout enforces it.
      couponIdentity: viewer?.phone ?? viewer?.email ?? "",
      isEmployee,
    });

    return NextResponse.json({
      items: priced.itemData.map((i) => ({
        variantId: i.variantId,
        productName: i.productName,
        variantLabel: i.variantLabel,
        image: absoluteUrl(i.image, origin),
        price: i.price,
        qty: i.qty,
        isFreebie: "isFreebie" in i && i.isFreebie === true,
      })),
      subtotal: priced.subtotal,
      discount: priced.discount,
      /** Set only when the coupon beat the weight discount and was applied */
      couponCode: priced.couponCode,
      shippingFee: priced.shippingFee,
      total: priced.total,
      weightKg: priced.weightKg,
      preorder: priced.preorder,
    });
  } catch (err) {
    // Out of stock, a coupon that doesn't apply, a closed pre-order — all
    // things the customer can act on, so the message goes back as-is.
    if (err instanceof CheckoutError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    await logError("api", "Cart pricing failed", err);
    return NextResponse.json({ error: "Could not price the cart." }, { status: 500 });
  }
}
