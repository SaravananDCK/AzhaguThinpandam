"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const addressSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/),
  line1: z.string().trim().min(3).max(200),
  line2: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().min(2).max(100),
  state: z.string().trim().min(2).max(100),
  pincode: z.string().trim().regex(/^\d{6}$/),
});

export async function addAddress(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not signed in." };

  const parsed = addressSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Please check the address details." };

  const count = await prisma.address.count({ where: { userId: session.user.id } });
  await prisma.address.create({
    data: {
      ...parsed.data,
      line2: parsed.data.line2 || null,
      userId: session.user.id,
      isDefault: count === 0,
    },
  });
  revalidatePath("/account/addresses");
  return { ok: true };
}

export async function deleteAddress(id: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not signed in." };
  await prisma.address.deleteMany({ where: { id, userId: session.user.id } });
  revalidatePath("/account/addresses");
  return { ok: true };
}

export async function setDefaultAddress(id: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not signed in." };
  const address = await prisma.address.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!address) return { error: "Address not found." };
  await prisma.$transaction([
    prisma.address.updateMany({
      where: { userId: session.user.id },
      data: { isDefault: false },
    }),
    prisma.address.update({ where: { id }, data: { isDefault: true } }),
  ]);
  revalidatePath("/account/addresses");
  return { ok: true };
}
