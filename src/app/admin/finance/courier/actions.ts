"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { rupeesToPaise } from "@/lib/money";
import { parseISTDay } from "@/lib/courier-report";

/**
 * Saves what the courier billed for each parcel, typed in from their paper
 * statement, plus a corrected ship date where ours was a guess. Blank boxes
 * and unchanged values are left alone.
 */
export async function saveCourierCharges(formData: FormData): Promise<void> {
  await assertAdmin();

  const updates = new Map<string, { shippingCost?: number; shippedAt?: Date }>();
  for (const [key, raw] of formData.entries()) {
    const value = String(raw).trim();
    const [field, id] = key.split(":");
    if (!id || !value) continue;
    if (field === "cost") {
      const paise = rupeesToPaise(value);
      if (paise === null || paise < 0) continue;
      if (String(formData.get(`was-cost:${id}`) ?? "") === value) continue;
      updates.set(id, { ...updates.get(id), shippingCost: paise });
    } else if (field === "date") {
      if (String(formData.get(`was-date:${id}`) ?? "") === value) continue;
      const day = parseISTDay(value);
      // Noon IST, so the day can't slip across midnight in any display
      if (day) updates.set(id, { ...updates.get(id), shippedAt: new Date(day.getTime() + 12 * 3600 * 1000) });
    }
  }

  for (const [id, data] of updates) {
    await prisma.order.update({ where: { id }, data }).catch(() => {});
  }

  revalidatePath("/admin/finance/courier");
  revalidatePath("/admin/finance");
  revalidatePath("/admin/orders");
}
