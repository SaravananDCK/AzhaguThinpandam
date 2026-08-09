import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin";
import { recomputeProductRating } from "@/lib/reviews";
import { REVIEW_STATUSES } from "@/lib/constants";

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

// Admin-entered review on a customer's behalf (feedback sent over WhatsApp).
// No user link, goes live immediately as APPROVED, and may be backdated to
// when the customer actually said it.
const createSchema = z.object({
  productId: z.string().min(1),
  authorName: z.string().trim().min(1, "Customer name is required").max(80),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(120).optional().or(z.literal("")),
  body: z.string().trim().max(2000).optional().or(z.literal("")),
  date: z.coerce.date(),
});

export async function POST(req: Request) {
  const { response } = await requireAdminApi();
  if (response) return response;

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid review" },
      { status: 400 }
    );
  }
  const { productId, authorName, rating, title, body, date } = parsed.data;

  if (date.getTime() > Date.now()) {
    return NextResponse.json({ error: "The review date can't be in the future." }, { status: 400 });
  }
  // Inactive products allowed on purpose — feedback can predate a delisting.
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.review.create({
      data: {
        productId,
        userId: null,
        rating,
        title: title || null,
        body: body || null,
        authorName,
        status: REVIEW_STATUSES.APPROVED,
        createdAt: date,
      },
    });
    await recomputeProductRating(tx, productId);
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
