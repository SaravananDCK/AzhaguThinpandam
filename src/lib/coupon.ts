import { prisma } from "@/lib/prisma";
import type { Coupon } from "@prisma/client";

export const COUPON_TYPES = ["PERCENT", "FLAT"] as const;
export type CouponType = (typeof COUPON_TYPES)[number];

export function normalizeCouponCode(code: string): string {
  return code.trim().toUpperCase();
}

/**
 * Discount (paise) a coupon yields on a given subtotal. PERCENT applies the
 * percentage (optionally capped by maxDiscount); FLAT is a fixed amount. Never
 * exceeds the subtotal.
 */
export function couponDiscountFor(coupon: Coupon, subtotal: number): number {
  let discount: number;
  if (coupon.type === "PERCENT") {
    discount = Math.round((subtotal * coupon.value) / 100);
    if (coupon.maxDiscount != null) discount = Math.min(discount, coupon.maxDiscount);
  } else {
    discount = coupon.value; // paise
  }
  return Math.max(0, Math.min(discount, subtotal));
}

export type CouponResult =
  | { ok: true; coupon: Coupon; discount: number }
  | { ok: false; error: string };

/**
 * Server-authoritative coupon check. Verifies the code exists, is active, is
 * within its date window, meets the minimum order, and that this phone number
 * hasn't already hit the per-customer limit. Returns the discount in paise.
 */
export async function validateCoupon(params: {
  code: string;
  subtotal: number; // paise
  phone: string;
}): Promise<CouponResult> {
  const code = normalizeCouponCode(params.code);
  if (!code) return { ok: false, error: "Enter a coupon code." };

  const coupon = await prisma.coupon.findUnique({ where: { code } });
  if (!coupon || !coupon.isActive) {
    return { ok: false, error: "This coupon code isn't valid." };
  }

  const now = new Date();
  if (coupon.startsAt && now < coupon.startsAt) {
    return { ok: false, error: "This coupon isn't active yet." };
  }
  if (coupon.endsAt && now > coupon.endsAt) {
    return { ok: false, error: "This coupon has expired." };
  }
  if (params.subtotal < coupon.minOrder) {
    const { formatINR } = await import("@/lib/money");
    return {
      ok: false,
      error: `Add ${formatINR(coupon.minOrder - params.subtotal)} more to use this coupon (min order ${formatINR(coupon.minOrder)}).`,
    };
  }

  if (coupon.perCustomerLimit > 0 && params.phone) {
    const used = await prisma.couponRedemption.count({
      where: { couponId: coupon.id, phone: params.phone },
    });
    if (used >= coupon.perCustomerLimit) {
      return { ok: false, error: "You've already used this coupon." };
    }
  }

  const discount = couponDiscountFor(coupon, params.subtotal);
  if (discount <= 0) return { ok: false, error: "This coupon has no value on your order." };

  return { ok: true, coupon, discount };
}
