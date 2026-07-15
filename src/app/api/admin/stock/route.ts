import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin";

export async function GET() {
  const { response } = await requireAdminApi();
  if (response) return response;
  const movements = await prisma.stockMovement.findMany({
    orderBy: { createdAt: "desc" },
    take: 1000,
    include: { variant: { include: { product: { select: { name: true } } } } },
  });
  return NextResponse.json(
    movements.map((m) => ({
      id: m.id,
      createdAt: m.createdAt,
      product: m.variant.product.name,
      pack: m.variant.label,
      delta: m.delta,
      balanceAfter: m.balanceAfter,
      reason: m.reason,
      reference: m.reference,
      note: m.note,
    }))
  );
}
