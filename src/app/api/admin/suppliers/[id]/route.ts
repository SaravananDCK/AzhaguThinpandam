import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin";
import { supplierSchema } from "../schema";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const { response } = await requireAdminApi();
  if (response) return response;
  const { id } = await params;

  const existing = await prisma.supplier.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Supplier not found." }, { status: 404 });

  const parsed = supplierSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid supplier." },
      { status: 400 }
    );
  }
  const d = parsed.data;
  const supplier = await prisma.supplier.update({
    where: { id },
    data: {
      name: d.name,
      gstin: d.gstin || null,
      phone: d.phone || null,
      email: d.email || null,
      address: d.address || null,
      gstRate: d.gstRate ?? null,
      notes: d.notes || null,
      isActive: d.isActive,
    },
  });
  return NextResponse.json(supplier);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { response } = await requireAdminApi();
  if (response) return response;
  const { id } = await params;

  const purchaseCount = await prisma.purchase.count({ where: { supplierId: id } });
  if (purchaseCount > 0) {
    // Keep the payables history intact — deactivate instead of deleting.
    await prisma.supplier.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json({ deactivated: true });
  }
  // No linked purchases: safe to remove (payments cascade-delete).
  await prisma.supplier.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
