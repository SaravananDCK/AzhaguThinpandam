import { NextResponse } from "next/server";
import { requireAdminApi, slugify } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { recordMovement, STOCK_REASONS } from "@/lib/stock";
import { productSchema } from "./schema";

export async function POST(req: Request) {
  const { response } = await requireAdminApi();
  if (response) return response;

  const parsed = productSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid product data." },
      { status: 400 }
    );
  }
  const data = parsed.data;

  const slug = data.slug ? slugify(data.slug) : slugify(data.name);
  if (!slug) return NextResponse.json({ error: "Could not derive a slug." }, { status: 400 });

  const existing = await prisma.product.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json(
      { error: `Slug "${slug}" is already in use.` },
      { status: 409 }
    );
  }

  const product = await prisma.$transaction(async (tx) => {
    const created = await tx.product.create({
      data: {
        name: data.name,
        tamilName: data.tamilName || null,
        slug,
        description: data.description,
        categoryId: data.categoryId,
        isActive: data.isActive,
        isFeatured: data.isFeatured,
        isFlagship: data.isFlagship,
        images: {
          create: data.images.map((url, i) => ({ url, sortOrder: i })),
        },
        variants: {
          create: data.variants.map((v, i) => ({
            label: v.label,
            price: v.price,
            mrp: v.mrp ?? null,
            stock: v.stock,
            sku: v.sku || null,
            sortOrder: i,
          })),
        },
      },
      include: { variants: true },
    });
    for (const v of created.variants) {
      if (v.stock > 0) {
        await recordMovement(tx, {
          variantId: v.id,
          delta: v.stock,
          reason: STOCK_REASONS.ADJUSTMENT,
          note: "Initial stock",
        });
      }
    }
    return created;
  });

  return NextResponse.json({ id: product.id });
}
