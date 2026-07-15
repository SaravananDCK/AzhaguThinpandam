import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin";
import { recordMovement, STOCK_REASONS } from "@/lib/stock";
import { purchaseSchema } from "./schema";

export async function GET() {
  const { response } = await requireAdminApi();
  if (response) return response;
  const purchases = await prisma.purchase.findMany({
    orderBy: { date: "desc" },
    include: { items: { include: { variant: { include: { product: true } } } } },
  });
  return NextResponse.json(purchases);
}

export async function POST(req: NextRequest) {
  const { response } = await requireAdminApi();
  if (response) return response;
  const parsed = purchaseSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid purchase." },
      { status: 400 }
    );
  }
  const items = parsed.data.items.map((i) => ({
    description: i.description,
    qty: i.qty,
    unitCost: i.unitCost,
    amount: Math.round(i.qty * i.unitCost),
    variantId: i.variantId || null,
    packs: i.variantId ? (i.packs ?? null) : null,
  }));

  const purchase = await prisma.$transaction(async (tx) => {
    const created = await tx.purchase.create({
      data: {
        date: parsed.data.date,
        supplier: parsed.data.supplier,
        invoiceNo: parsed.data.invoiceNo || null,
        notes: parsed.data.notes || null,
        total: items.reduce((s, i) => s + i.amount, 0),
        items: { create: items },
      },
      include: { items: true },
    });
    // Receive linked items into stock
    for (const item of created.items) {
      if (!item.variantId || !item.packs) continue;
      await tx.productVariant.update({
        where: { id: item.variantId },
        data: { stock: { increment: item.packs } },
      });
      await recordMovement(tx, {
        variantId: item.variantId,
        delta: item.packs,
        reason: STOCK_REASONS.PURCHASE_IN,
        reference: created.invoiceNo ?? created.id.slice(-8),
      });
    }
    return created;
  });
  return NextResponse.json(purchase, { status: 201 });
}
