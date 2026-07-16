import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin";
import { formatINR } from "@/lib/money";
import { priceRoundingIsFive, recomputeProductPrices } from "@/lib/pricing-server";

// Grid sends rupees / percent; nulls clear the field.
const patchSchema = z.object({
  purchasePerKg: z.number().min(0).nullable().optional(),
  marginPct: z.number().min(0).max(1000).nullable().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const { response } = await requireAdminApi();
  if (response) return response;
  const { id } = await params;

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid pricing values." }, { status: 400 });
  }

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

  // Merge incoming changes onto the stored values (batch edit sends only changed fields)
  const purchasePaise =
    parsed.data.purchasePerKg === undefined
      ? existing.purchasePricePerKg
      : parsed.data.purchasePerKg === null
        ? null
        : Math.round(parsed.data.purchasePerKg * 100);
  const margin =
    parsed.data.marginPct === undefined ? existing.profitMarginPct : parsed.data.marginPct;

  const roundToFive = await priceRoundingIsFive();

  const updated = await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id },
      data: { purchasePricePerKg: purchasePaise, profitMarginPct: margin },
    });
    // Reprice variants only when both inputs are present
    if (purchasePaise != null && purchasePaise > 0 && margin != null) {
      await recomputeProductPrices(tx, id, purchasePaise, margin, roundToFive);
    }
    return tx.product.findUniqueOrThrow({
      where: { id },
      include: {
        category: { select: { name: true } },
        variants: { where: { isActive: true }, select: { price: true, sortOrder: true } },
      },
    });
  }, {
    // Batch price saves fire many of these at once; give them room to queue
    maxWait: 20000,
    timeout: 20000,
  });

  const prices =
    [...updated.variants]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((v) => formatINR(v.price))
      .join(" / ") || "—";

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    category: updated.category.name,
    active: updated.isActive,
    purchasePerKg: purchasePaise != null ? purchasePaise / 100 : null,
    marginPct: margin,
    prices,
  });
}
