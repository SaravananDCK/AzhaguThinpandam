import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin";

const purchaseSchema = z.object({
  date: z.coerce.date(),
  supplier: z.string().trim().min(1).max(200),
  invoiceNo: z.string().trim().max(100).optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
  items: z
    .array(
      z.object({
        description: z.string().trim().min(1).max(300),
        qty: z.number().positive().max(100000),
        unitCost: z.number().int().min(1),
      })
    )
    .min(1)
    .max(100),
});

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const { response } = await requireAdminApi();
  if (response) return response;
  const { id } = await params;
  const parsed = purchaseSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid purchase." }, { status: 400 });
  }
  const items = parsed.data.items.map((i) => ({
    ...i,
    amount: Math.round(i.qty * i.unitCost),
  }));
  try {
    const purchase = await prisma.$transaction(async (tx) => {
      await tx.purchaseItem.deleteMany({ where: { purchaseId: id } });
      return tx.purchase.update({
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
    });
    return NextResponse.json(purchase);
  } catch {
    return NextResponse.json({ error: "Purchase not found." }, { status: 404 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { response } = await requireAdminApi();
  if (response) return response;
  const { id } = await params;
  try {
    await prisma.purchase.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Purchase not found." }, { status: 404 });
  }
}
