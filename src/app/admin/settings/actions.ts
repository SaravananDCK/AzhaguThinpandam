"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertAdmin } from "@/lib/admin";
import { DISCOUNT_TYPES, SETTINGS, type DiscountType } from "@/lib/constants";
import { parseGoodieTiers } from "@/lib/box";
import { rupeesToPaise } from "@/lib/money";

export async function saveSettings(formData: FormData) {
  await assertAdmin();

  const shippingFee = rupeesToPaise(String(formData.get("shippingFee") ?? ""));
  const freeAbove = rupeesToPaise(String(formData.get("freeShippingAbove") ?? ""));
  const outsideTnPerKg = rupeesToPaise(String(formData.get("outsideTnPerKg") ?? "0"));
  const packingCost = rupeesToPaise(String(formData.get("packingCost") ?? "0"));
  const lowStock = parseInt(String(formData.get("lowStockThreshold") ?? ""), 10);

  if (
    shippingFee === null ||
    freeAbove === null ||
    outsideTnPerKg === null ||
    packingCost === null ||
    Number.isNaN(lowStock) ||
    lowStock < 0
  ) {
    return { error: "Please enter valid numbers." };
  }

  const boxTiers = String(formData.get("boxTiers") ?? "").trim();
  if (boxTiers && !/^\d+(?:\.\d+)?\s*:\s*\d+(\s*,\s*\d+(?:\.\d+)?\s*:\s*\d+)*$/.test(boxTiers)) {
    return { error: "Discount tiers must look like 1:10,2:15,3:20 (kg:percent, or be empty)." };
  }

  const discountType = String(formData.get("discountType") ?? "percent");
  if (!DISCOUNT_TYPES.includes(discountType as DiscountType)) {
    return { error: "Pick a valid discount type." };
  }
  // The editor only serializes complete rows, so anything the parser drops was
  // hand-crafted or corrupt — reject rather than silently losing config.
  const goodieTiersRaw = String(formData.get("goodieTiers") ?? "[]");
  const goodieTiers = parseGoodieTiers(goodieTiersRaw);
  let rawCount = 0;
  try {
    const raw = JSON.parse(goodieTiersRaw);
    rawCount = Array.isArray(raw) ? raw.length : -1;
  } catch {
    rawCount = -1;
  }
  if (rawCount === -1 || goodieTiers.length !== rawCount) {
    return { error: "Goodie rows must each have a weight, an item and a quantity." };
  }
  if (goodieTiers.length > 30) {
    return { error: "Keep goodie tiers to 30 rows or fewer." };
  }
  if (discountType === "goodies" && goodieTiers.length === 0) {
    return { error: "Add at least one goodie row (or switch back to percent tiers)." };
  }
  const goodieVariantIds = [...new Set(goodieTiers.map((g) => g.variantId))];
  if (goodieVariantIds.length) {
    const found = await prisma.productVariant.count({
      where: { id: { in: goodieVariantIds } },
    });
    if (found !== goodieVariantIds.length) {
      return { error: "One of the goodie items no longer exists — pick it again." };
    }
  }

  const gstRate = parseFloat(String(formData.get("defaultGstRate") ?? "0"));
  if (!Number.isFinite(gstRate) || gstRate < 0 || gstRate > 100) {
    return { error: "Default GST rate must be between 0 and 100." };
  }

  const gaMeasurementId = String(formData.get("gaMeasurementId") ?? "").trim();
  if (gaMeasurementId && !/^G-[A-Z0-9]{4,20}$/i.test(gaMeasurementId)) {
    return { error: "Google Analytics ID should look like G-XXXXXXXXXX (or be empty)." };
  }

  const upiId = String(formData.get("upiId") ?? "").trim();
  if (upiId && !/^[\w.\-]{2,}@[\w.\-]{2,}$/.test(upiId)) {
    return { error: "UPI ID should look like yourname@bank." };
  }
  // Manual mode without a UPI ID is allowed — the order page then tells the
  // customer we'll send payment details on WhatsApp instead.
  const manualUpi = formData.get("manualUpiPayment") ? "1" : "0";

  const values: Record<string, string> = {
    [SETTINGS.STORE_NAME]: String(formData.get("storeName") ?? "").trim(),
    [SETTINGS.STORE_PHONE]: String(formData.get("storePhone") ?? "").trim(),
    [SETTINGS.STORE_EMAIL]: String(formData.get("storeEmail") ?? "").trim(),
    [SETTINGS.STORE_ADDRESS]: String(formData.get("storeAddress") ?? "").trim(),
    [SETTINGS.SHIPPING_FEE]: String(shippingFee),
    [SETTINGS.FREE_SHIPPING_ABOVE]: String(freeAbove),
    [SETTINGS.OUTSIDE_TN_PER_KG]: String(outsideTnPerKg),
    [SETTINGS.LOW_STOCK_THRESHOLD]: String(lowStock),
    [SETTINGS.BOX_TIERS]: boxTiers,
    [SETTINGS.DISCOUNT_TYPE]: discountType,
    [SETTINGS.GOODIE_TIERS]: JSON.stringify(goodieTiers),
    [SETTINGS.PACKING_COST]: String(packingCost),
    [SETTINGS.ROUND_TO_FIVE]: formData.get("roundToFive") ? "1" : "0",
    [SETTINGS.INSTAGRAM_HANDLE]: String(formData.get("instagramHandle") ?? "")
      .trim()
      .replace(/^@/, ""),
    [SETTINGS.INSTAGRAM_REELS]: String(formData.get("instagramReels") ?? "").trim(),
    [SETTINGS.GA_MEASUREMENT_ID]: gaMeasurementId,
    [SETTINGS.PRE_LAUNCH_NOTICE]: String(formData.get("preLaunchNotice") ?? "").trim(),
    [SETTINGS.DEFAULT_GST_RATE]: String(gstRate),
    [SETTINGS.MANUAL_UPI_PAYMENT]: manualUpi,
    [SETTINGS.UPI_ID]: upiId,
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
