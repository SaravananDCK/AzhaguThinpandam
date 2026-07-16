import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin";
import { SETTINGS } from "@/lib/constants";
import { priceRoundingIsFive, recomputeAllProducts } from "@/lib/pricing-server";

// Optionally set the ₹5-rounding mode, then reprice the whole catalog from each
// product's stored rule. `roundToFive` is optional — when omitted, the current
// saved setting is used.
const bodySchema = z.object({ roundToFive: z.boolean().optional() });

export async function POST(req: NextRequest) {
  const { response } = await requireAdminApi();
  if (response) return response;

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Persist the rounding choice first so the recompute (and future edits) agree.
  if (parsed.data.roundToFive !== undefined) {
    const value = parsed.data.roundToFive ? "1" : "0";
    await prisma.setting.upsert({
      where: { key: SETTINGS.ROUND_TO_FIVE },
      update: { value },
      create: { key: SETTINGS.ROUND_TO_FIVE, value },
    });
  }

  const roundToFive = await priceRoundingIsFive();
  const { productsUpdated, variantsUpdated } = await recomputeAllProducts(roundToFive);

  return NextResponse.json({ productsUpdated, variantsUpdated, roundToFive });
}
