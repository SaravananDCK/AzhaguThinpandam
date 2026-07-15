import { NextResponse } from "next/server";
import { requireAdminApi, slugify } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { recordMovement, STOCK_REASONS } from "@/lib/stock";
import { productSchema } from "../schema";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Ctx) {
  const { response } = await requireAdminApi();
  if (response) return response;
  const { id } = await params;

  const product = await prisma.product.findUnique({
    where: { id },
    include: { variants: true },
  });
  if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });

  const parsed = productSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid product data." },
      { status: 400 }
    );
  }
  const data = parsed.data;

  const slug = data.slug ? slugify(data.slug) : slugify(data.name);
  const slugTaken = await prisma.product.findFirst({
    where: { slug, id: { not: id } },
  });
  if (slugTaken) {
    return NextResponse.json({ error: `Slug "${slug}" is already in use.` }, { status: 409 });
  }

  const keptVariantIds = data.variants.filter((v) => v.id).map((v) => v.id as string);
  const removedVariants = product.variants.filter((v) => !keptVariantIds.includes(v.id));

  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id },
      data: {
        name: data.name,
        tamilName: data.tamilName || null,
        slug,
        description: data.description,
        categoryId: data.categoryId,
        isActive: data.isActive,
        isFeatured: data.isFeatured,
        isFlagship: data.isFlagship,
      },
    });

    // Replace images (order matters)
    await tx.productImage.deleteMany({ where: { productId: id } });
    if (data.images.length) {
      await tx.productImage.createMany({
        data: data.images.map((url, i) => ({ productId: id, url, sortOrder: i })),
      });
    }

    // Sync variants
    for (const [i, v] of data.variants.entries()) {
      if (v.id) {
        const before = product.variants.find((pv) => pv.id === v.id);
        await tx.productVariant.update({
          where: { id: v.id, productId: id },
          data: {
            label: v.label,
            price: v.price,
            mrp: v.mrp ?? null,
            stock: v.stock,
            sku: v.sku || null,
            sortOrder: i,
            isActive: true,
          },
        });
        if (before && before.stock !== v.stock) {
          await recordMovement(tx, {
            variantId: v.id,
            delta: v.stock - before.stock,
            reason: STOCK_REASONS.ADJUSTMENT,
            note: "Edited in admin",
          });
        }
      } else {
        const created = await tx.productVariant.create({
          data: {
            productId: id,
            label: v.label,
            price: v.price,
            mrp: v.mrp ?? null,
            stock: v.stock,
            sku: v.sku || null,
            sortOrder: i,
          },
        });
        if (v.stock > 0) {
          await recordMovement(tx, {
            variantId: created.id,
            delta: v.stock,
            reason: STOCK_REASONS.ADJUSTMENT,
            note: "Initial stock",
          });
        }
      }
    }

    // Removed variants: hard-delete if never ordered, otherwise deactivate
    for (const v of removedVariants) {
      const ordered = await tx.orderItem.count({ where: { variantId: v.id } });
      if (ordered === 0) {
        await tx.productVariant.delete({ where: { id: v.id } });
      } else {
        await tx.productVariant.update({
          where: { id: v.id },
          data: { isActive: false },
        });
      }
    }
  });

  return NextResponse.json({ id });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { response } = await requireAdminApi();
  if (response) return response;
  const { id } = await params;

  const product = await prisma.product.findUnique({
    where: { id },
    include: { variants: true },
  });
  if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });

  const orderedCount = await prisma.orderItem.count({
    where: { variantId: { in: product.variants.map((v) => v.id) } },
  });

  if (orderedCount > 0) {
    // Keep history intact — hide the product instead of deleting
    await prisma.product.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json({ deactivated: true });
  }

  await prisma.product.delete({ where: { id } }); // cascades images & variants
  return NextResponse.json({ deleted: true });
}
