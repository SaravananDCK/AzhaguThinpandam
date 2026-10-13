import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";
import { apiOrigin, serializeOrder } from "@/lib/api-serialize";

/** The signed-in customer's orders, newest first. */
export async function GET(req: Request) {
  const { user, response } = await requireUser();
  if (response) return response;

  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    include: { items: true, payment: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const origin = apiOrigin(req);
  return NextResponse.json({ orders: orders.map((o) => serializeOrder(o, origin)) });
}
