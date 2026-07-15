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
        unitCost: z.number().int().min(1), // paise
      })
    )
    .min(1)
    .max(100),
});

export async function GET() {
  const { response } = await requireAdminApi();
  if (response) return response;
  const purchases = await prisma.purchase.findMany({
    orderBy: { date: "desc" },
    include: { items: true },
  });
  return NextResponse.json(purchases);
}

export async function POST(req: NextRequest) {
  const { response } = await requireAdminApi();
  if (response) return response;
  const parsed = purchaseSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid purchase." }, { status: 400 });
  }
  const items = parsed.data.items.map((i) => ({
    ...i,
    amount: Math.round(i.qty * i.unitCost),
  }));
  const purchase = await prisma.purchase.create({
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
  return NextResponse.json(purchase, { status: 201 });
}
