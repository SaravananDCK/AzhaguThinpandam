import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin";
import { supplierSchema } from "./schema";
import { supplierBalanceSums } from "@/lib/finance";

// Returns every supplier with its payment history and derived balances
// (purchased / paid / owed), so the admin grid can render without extra calls.
export async function GET() {
  const { response } = await requireAdminApi();
  if (response) return response;

  const [suppliers, { purchasedBy, paidBy }] = await Promise.all([
    prisma.supplier.findMany({
      orderBy: { name: "asc" },
      include: { payments: { orderBy: { date: "desc" } } },
    }),
    // Shared with computePayables — one definition of the balance, so the
    // suppliers grid and the finance report can never disagree (they did
    // once: this route missed transportCharge and showed a stale owed).
    supplierBalanceSums(),
  ]);

  const rows = suppliers.map((s) => {
    const purchased = purchasedBy.get(s.id) ?? 0;
    const paid = paidBy.get(s.id) ?? 0;
    return { ...s, purchased, paid, owed: purchased - paid };
  });

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const { response } = await requireAdminApi();
  if (response) return response;
  const parsed = supplierSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid supplier." },
      { status: 400 }
    );
  }
  const d = parsed.data;
  const supplier = await prisma.supplier.create({
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
  return NextResponse.json(supplier, { status: 201 });
}
