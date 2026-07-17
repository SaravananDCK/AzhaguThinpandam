import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin";
import { normalizeCouponCode } from "@/lib/coupon";
import { toDisplay } from "../route";

// Partial update — the grid sends only changed fields. Money is in rupees.
const patchSchema = z.object({
  code: z.string().trim().min(1).max(40).optional(),
  type: z.enum(["PERCENT", "FLAT"]).optional(),
  value: z.number().min(0).optional(),
  maxDiscount: z.number().min(0).nullable().optional(),
  minOrder: z.number().min(0).nullable().optional(),
  perCustomerLimit: z.number().int().min(0).max(999).optional(),
  isActive: z.boolean().optional(),
  startsAt: z.coerce.date().nullable().optional(),
  endsAt: z.coerce.date().nullable().optional(),
});

const rupeesToPaise = (r: number) => Math.round(r * 100);

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const { response } = await requireAdminApi();
  if (response) return response;
  const { id } = await params;

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid coupon values." }, { status: 400 });
  }

  const existing = await prisma.coupon.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Coupon not found." }, { status: 404 });

  const d = parsed.data;
  // Value conversion depends on type; fall back to the stored type when it isn't
  // part of this change.
  const effectiveType = d.type ?? existing.type;
  const data: Prisma.CouponUpdateInput = {};
  if (d.code !== undefined) data.code = normalizeCouponCode(d.code);
  if (d.type !== undefined) data.type = d.type;
  if (d.value !== undefined) {
    data.value = effectiveType === "FLAT" ? rupeesToPaise(d.value) : Math.round(d.value);
  }
  if (d.maxDiscount !== undefined) {
    data.maxDiscount = d.maxDiscount != null ? rupeesToPaise(d.maxDiscount) : null;
  }
  if (d.minOrder !== undefined) data.minOrder = d.minOrder != null ? rupeesToPaise(d.minOrder) : 0;
  if (d.perCustomerLimit !== undefined) data.perCustomerLimit = d.perCustomerLimit;
  if (d.isActive !== undefined) data.isActive = d.isActive;
  if (d.startsAt !== undefined) data.startsAt = d.startsAt;
  if (d.endsAt !== undefined) data.endsAt = d.endsAt;

  try {
    const updated = await prisma.coupon.update({
      where: { id },
      data,
      include: { _count: { select: { redemptions: true } } },
    });
    return NextResponse.json(toDisplay(updated));
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "A coupon with that code already exists." }, { status: 409 });
    }
    throw e;
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { response } = await requireAdminApi();
  if (response) return response;
  const { id } = await params;

  // Redemptions cascade-delete; the order's couponId is set null by the DB.
  await prisma.coupon.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
