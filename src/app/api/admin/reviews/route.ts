import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin";

export async function GET() {
  const { response } = await requireAdminApi();
  if (response) return response;

  const reviews = await prisma.review.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      product: { select: { name: true, slug: true } },
      user: { select: { name: true, phone: true } },
    },
  });
  return NextResponse.json(reviews);
}
