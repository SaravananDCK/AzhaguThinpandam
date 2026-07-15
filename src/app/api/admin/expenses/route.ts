import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin";

const expenseSchema = z.object({
  date: z.coerce.date(),
  category: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  amount: z.number().int().min(1), // paise
});

export async function GET() {
  const { response } = await requireAdminApi();
  if (response) return response;
  const expenses = await prisma.expense.findMany({ orderBy: { date: "desc" } });
  return NextResponse.json(expenses);
}

export async function POST(req: NextRequest) {
  const { response } = await requireAdminApi();
  if (response) return response;
  const parsed = expenseSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid expense." }, { status: 400 });
  }
  const expense = await prisma.expense.create({
    data: { ...parsed.data, description: parsed.data.description || null },
  });
  return NextResponse.json(expense, { status: 201 });
}
