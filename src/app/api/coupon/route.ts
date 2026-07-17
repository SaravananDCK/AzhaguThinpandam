import { NextResponse } from "next/server";
import { z } from "zod";
import { validateCoupon } from "@/lib/coupon";

// Preview a coupon at checkout. The authoritative discount is recomputed
// server-side when the order is created (createOrderFromCart); this endpoint
// just lets the customer see the value before paying.
const schema = z.object({
  code: z.string().trim().min(1).max(40),
  subtotal: z.number().int().min(0),
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/)
    .optional()
    .or(z.literal("")),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ valid: false, error: "Enter a valid coupon code." }, { status: 400 });
  }

  const result = await validateCoupon({
    code: parsed.data.code,
    subtotal: parsed.data.subtotal,
    phone: parsed.data.phone || "",
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
