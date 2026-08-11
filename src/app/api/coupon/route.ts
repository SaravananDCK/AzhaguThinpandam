import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { validateCoupon } from "@/lib/coupon";

// Preview a coupon at checkout. The authoritative discount is recomputed
// server-side when the order is created (createOrderFromCart); this endpoint
// just lets the customer see the value before paying.
const schema = z.object({
  code: z.string().trim().min(1).max(40),
  subtotal: z.number().int().min(0),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ valid: false, error: "Enter a valid coupon code." }, { status: 400 });
  }

  // Per-customer limits key off the OTP-verified session identity (phone, or
  // email for phone-less accounts), never a value supplied by the client.
  // Guests get the discount preview without the limit check; it is enforced
  // for real once they verify and the order is created.
  const session = await auth();
  const result = await validateCoupon({
    code: parsed.data.code,
    subtotal: parsed.data.subtotal,
    phone: session?.user?.phone ?? session?.user?.email ?? "",
  });

  if (!result.ok) {
    return NextResponse.json({ valid: false, error: result.error });
  }
  return NextResponse.json({
    valid: true,
    code: result.coupon.code,
    discount: result.discount,
    type: result.coupon.type,
  });
}
