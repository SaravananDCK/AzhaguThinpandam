import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin";
import { supplierPaymentSchema } from "../../schema";

type Params = { params: Promise<{ id: string }> };

// Record a payment made to this supplier (reduces what we owe them).
export async function POST(req: NextRequest, { params }: Params) {
  const { response } = await requireAdminApi();
  if (response) return response;
  const { id } = await params;

  const supplier = await prisma.supplier.findUnique({ where: { id } });
  if (!supplier) return NextResponse.json({ error: "Supplier not found." }, { status: 404 });

  const parsed = supplierPaymentSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid payment." },
      { status: 400 }
    );
  }
  const d = parsed.data;
  const payment = await prisma.supplierPayment.create({
    data: {
      supplierId: id,
      date: d.date,
      amount: d.amount,
      method: d.method || null,
      reference: d.reference || null,
      notes: d.notes || null,
    },
  });
  return NextResponse.json(payment, { status: 201 });
}
