"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertAdmin } from "@/lib/admin";
import { SETTINGS } from "@/lib/constants";
import { rupeesToPaise } from "@/lib/money";

export async function saveSettings(formData: FormData) {
  await assertAdmin();

  const shippingFee = rupeesToPaise(String(formData.get("shippingFee") ?? ""));
  const freeAbove = rupeesToPaise(String(formData.get("freeShippingAbove") ?? ""));
  const lowStock = parseInt(String(formData.get("lowStockThreshold") ?? ""), 10);

  if (shippingFee === null || freeAbove === null || Number.isNaN(lowStock) || lowStock < 0) {
    return { error: "Please enter valid numbers." };
  }

  const boxTiers = String(formData.get("boxTiers") ?? "").trim();
  if (boxTiers && !/^\d+\s*:\s*\d+(\s*,\s*\d+\s*:\s*\d+)*$/.test(boxTiers)) {
    return { error: "Discount tiers must look like 3:10,4:15,6:20 (or be empty)." };
  }

  const values: Record<string, string> = {
    [SETTINGS.STORE_NAME]: String(formData.get("storeName") ?? "").trim(),
    [SETTINGS.STORE_PHONE]: String(formData.get("storePhone") ?? "").trim(),
    [SETTINGS.STORE_EMAIL]: String(formData.get("storeEmail") ?? "").trim(),
    [SETTINGS.STORE_ADDRESS]: String(formData.get("storeAddress") ?? "").trim(),
    [SETTINGS.SHIPPING_FEE]: String(shippingFee),
    [SETTINGS.FREE_SHIPPING_ABOVE]: String(freeAbove),
    [SETTINGS.LOW_STOCK_THRESHOLD]: String(lowStock),
    [SETTINGS.BOX_TIERS]: boxTiers,
  };

  await prisma.$transaction(
    Object.entries(values).map(([key, value]) =>
      prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } })
    )
  );

  revalidatePath("/admin/settings");
  revalidatePath("/");
  return { ok: true };
}
