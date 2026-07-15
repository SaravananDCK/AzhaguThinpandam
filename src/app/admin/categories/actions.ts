"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertAdmin, slugify } from "@/lib/admin";

const categorySchema = z.object({
  name: z.string().trim().min(2).max(100),
  tamilName: z.string().trim().max(100).optional().or(z.literal("")),
  image: z.string().trim().max(500).optional().or(z.literal("")),
});

export async function saveCategory(id: string | null, formData: FormData) {
  await assertAdmin();

  const parsed = categorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Please check the category details." };
  const { name, tamilName, image } = parsed.data;

  const slug = slugify(name);
  if (!slug) return { error: "Name must contain letters or numbers." };

  const clash = await prisma.category.findFirst({
    where: { slug, ...(id ? { id: { not: id } } : {}) },
  });
  if (clash) return { error: `A category with slug "${slug}" already exists.` };

  if (id) {
    await prisma.category.update({
      where: { id },
      data: { name, tamilName: tamilName || null, slug, image: image || null },
    });
  } else {
    const count = await prisma.category.count();
    await prisma.category.create({
      data: {
        name,
        tamilName: tamilName || null,
        slug,
        image: image || null,
        sortOrder: count,
      },
    });
  }

  revalidatePath("/admin/categories");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteCategory(id: string) {
  await assertAdmin();

  const productCount = await prisma.product.count({ where: { categoryId: id } });
  if (productCount > 0) {
    return {
      error: `This category has ${productCount} product(s). Move or delete them first.`,
    };
  }
  await prisma.category.delete({ where: { id } });
  revalidatePath("/admin/categories");
  revalidatePath("/");
  return { ok: true };
}
