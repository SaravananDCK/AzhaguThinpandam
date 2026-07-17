import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin";
import { normalizeCouponCode } from "@/lib/coupon";

// Grid sends money in rupees; DB stores paise. `value` is a percent (PERCENT)
// or a rupee amount (FLAT).
export const couponSchema = z.object({
  code: z.string().trim().min(1).max(40),
  type: z.enum(["PERCENT", "FLAT"]),
  value: z.number().min(0),
  maxDiscount: z.number().min(0).nullable().optional(),
  minOrder: z.number().min(0).nullable().optional(),
  perCustomerLimit: z.number().int().min(0).max(999).optional(),
  isActive: z.boolean().optional(),
  startsAt: z.coerce.date().nullable().optional(),
  endsAt: z.coerce.date().nullable().optional(),
});

const rupeesToPaise = (r: number) => Math.round(r * 100);

export function toStored(data: z.infer<typeof couponSchema>) {
  return {
    code: normalizeCouponCode(data.code),
    type: data.type,
    value: data.type === "FLAT" ? rupeesToPaise(data.value) : Math.round(data.value),
    maxDiscount: data.maxDiscount != null ? rupeesToPaise(data.maxDiscount) : null,
    minOrder: data.minOrder != null ? rupeesToPaise(data.minOrder) : 0,
    perCustomerLimit: data.perCustomerLimit ?? 1,
    isActive: data.isActive ?? true,
    startsAt: data.startsAt ?? null,
    endsAt: data.endsAt ?? null,
  };
}

export function toDisplay(c: {
  id: string;
  code: string;
  type: string;
  value: number;
  maxDiscount: number | null;
  minOrder: number;
  perCustomerLimit: number;
  isActive: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  _count?: { redemptions: number };
}) {
  return {
    id: c.id,
    code: c.code,
    type: c.type,
    value: c.type === "FLAT" ? c.value / 100 : c.value,
    maxDiscount: c.maxDiscount != null ? c.maxDiscount / 100 : null,
    minOrder: c.minOrder / 100,
    perCustomerLimit: c.perCustomerLimit,
    isActive: c.isActive,
    startsAt: c.startsAt,
    endsAt: c.endsAt,
    redemptions: c._count?.redemptions ?? 0,
  };
}

export async function GET() {
  const { response } = await requireAdminApi();
  if (response) return response;

  const coupons = await prisma.coupon.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { redemptions: true } } },
  });
  return NextResponse.json(coupons.map(toDisplay));
}

export async function POST(req: Request) {
  const { response } = await requireAdminApi();
  if (response) return response;

  const parsed = couponSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Please fill in valid coupon values." }, { status: 400 });
  }

  try {
    const created = await prisma.coupon.create({ data: toStored(parsed.data) });
    return NextResponse.json(toDisplay({ ...created, _count: { redemptions: 0 } }));
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "A coupon with that code already exists." }, { status: 409 });
    }
    throw e;
  }
}
