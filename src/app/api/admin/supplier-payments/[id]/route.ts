import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { response } = await requireAdminApi();
  if (response) return response;
  const { id } = await params;

  const existing = await prisma.supplierPayment.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Payment not found." }, { status: 404 });

  await prisma.supplierPayment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
