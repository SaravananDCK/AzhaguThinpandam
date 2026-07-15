import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin";
import { recordMovement, STOCK_REASONS } from "@/lib/stock";
import { purchaseSchema } from "../schema";

type Params = { params: Promise<{ id: string }> };

/** Reverses the stock received from a purchase's linked items. */
async function revertLinkedStock(
  tx: Prisma.TransactionClient,
  purchase: { invoiceNo: string | null; id: string },
  items: { variantId: string | null; packs: number | null }[],
  note: string
) {
  for (const item of items) {
    if (!item.variantId || !item.packs) continue;
    // Never push stock below zero even if some was already sold
    const variant = await tx.productVariant.findUnique({
      where: { id: item.variantId },
      select: { stock: true },
    });
    if (!variant) continue;
    const delta = -Math.min(item.packs, variant.stock);
    if (delta === 0) continue;
    await tx.productVariant.update({
      where: { id: item.variantId },
      data: { stock: { increment: delta } },
    });
    await recordMovement(tx, {
      variantId: item.variantId,
      delta,
      reason: STOCK_REASONS.PURCHASE_IN,
      reference: purchase.invoiceNo ?? purchase.id.slice(-8),
      note,
    });
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { response } = await requireAdminApi();
  if (response) return response;
  const { id } = await params;

  const existing = await prisma.purchase.findUnique({ where: { id }, include: { items: true } });
  if (!existing) return NextResponse.json({ error: "Purchase not found." }, { status: 404 });

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
    await revertLinkedStock(tx, existing, existing.items, "Reversed (purchase edited)");
    await tx.purchaseItem.deleteMany({ where: { purchaseId: id } });
    const updated = await tx.purchase.update({
      where: { id },
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
    for (const item of updated.items) {
      if (!item.variantId || !item.packs) continue;
      await tx.productVariant.update({
        where: { id: item.variantId },
        data: { stock: { increment: item.packs } },
      });
      await recordMovement(tx, {
        variantId: item.variantId,
        delta: item.packs,
        reason: STOCK_REASONS.PURCHASE_IN,
        reference: updated.invoiceNo ?? updated.id.slice(-8),
      });
    }
    return updated;
  });
  return NextResponse.json(purchase);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { response } = await requireAdminApi();
  if (response) return response;
  const { id } = await params;

  const existing = await prisma.purchase.findUnique({ where: { id }, include: { items: true } });
  if (!existing) return NextResponse.json({ error: "Purchase not found." }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    await revertLinkedStock(tx, existing, existing.items, "Reversed (purchase deleted)");
    await tx.purchase.delete({ where: { id } });
  });
  return NextResponse.json({ ok: true });
}
