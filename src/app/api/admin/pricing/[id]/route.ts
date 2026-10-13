import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin";
import { formatINR } from "@/lib/money";
import { normalizeLabels } from "@/lib/labels";
import { marginFromBasePrice } from "@/lib/pricing";
import { priceRoundingIsFive, recomputeProductPrices } from "@/lib/pricing-server";

// Grid sends rupees / percent; nulls clear the field.
const patchSchema = z.object({
  purchasePerKg: z.number().min(0).nullable().optional(),
  marginPct: z.number().min(0).max(1000).nullable().optional(),
  labels: z.string().max(300).nullable().optional(), // comma-separated
  /** Sale price per active pack (rupees), in the grid's order. Sets the margin from the base pack. */
  prices: z.array(z.number().min(1).max(100000)).min(1).max(20).optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const { response } = await requireAdminApi();
  if (response) return response;
  const { id } = await params;

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid pricing values." }, { status: 400 });
  }

  const existing = await prisma.product.findUnique({
    where: { id },
    include: {
      variants: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: { id: true, label: true, price: true, weightGrams: true },
      },
    },
  });
  if (!existing) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }
  const typedPrices = parsed.data.prices;
  if (typedPrices && typedPrices.length !== existing.variants.length) {
    return NextResponse.json(
      {
        error: `Enter ${existing.variants.length} price${existing.variants.length === 1 ? "" : "s"} for ${existing.name} (${existing.variants.map((v) => v.label).join(" / ")}).`,
      },
      { status: 400 }
    );
  }

  // Merge incoming changes onto the stored values (batch edit sends only changed fields)
  const purchasePaise =
    parsed.data.purchasePerKg === undefined
      ? existing.purchasePricePerKg
      : parsed.data.purchasePerKg === null
        ? null
        : Math.round(parsed.data.purchasePerKg * 100);
  // Typed prices win over the rule: the margin is read back from the base
  // pack so the two columns agree, and no reprice runs over what was typed.
  const newPrices = typedPrices?.map((r) => Math.round(r * 100)) ?? null;
  const marginFromTyped = newPrices
    ? marginFromBasePrice(
        purchasePaise,
        existing.variants.map((v, i) => ({ ...v, price: newPrices[i] }))
      )
    : null;
  const margin =
    marginFromTyped ??
    (parsed.data.marginPct === undefined ? existing.profitMarginPct : parsed.data.marginPct);

  const labels =
    parsed.data.labels === undefined ? existing.labels : normalizeLabels(parsed.data.labels);
  // A labels-only edit must not reprice: that would overwrite pack prices
  // adjusted by hand in the product form.
  const pricingChanged =
    !newPrices &&
    (parsed.data.purchasePerKg !== undefined || parsed.data.marginPct !== undefined);

  const roundToFive = await priceRoundingIsFive();

  const updated = await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id },
      data: { purchasePricePerKg: purchasePaise, profitMarginPct: margin, labels },
    });
    if (newPrices) {
      for (const [i, v] of existing.variants.entries()) {
        if (v.price === newPrices[i]) continue;
        // A hand-set price makes the computed strike-through meaningless
        await tx.productVariant.update({
          where: { id: v.id },
          data: { price: newPrices[i], mrp: null },
        });
      }
    }
    // Reprice variants only when both inputs are present
    if (pricingChanged && purchasePaise != null && purchasePaise > 0 && margin != null) {
      await recomputeProductPrices(tx, id, purchasePaise, margin, roundToFive);
    }
    return tx.product.findUniqueOrThrow({
      where: { id },
      include: {
        category: { select: { name: true } },
        variants: { where: { isActive: true }, select: { price: true, sortOrder: true } },
      },
    });
  }, {
    // Batch price saves fire many of these at once; give them room to queue
    maxWait: 20000,
    timeout: 20000,
  });

  const prices =
    [...updated.variants]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((v) => formatINR(v.price))
      .join(" / ") || "—";

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    category: updated.category.name,
    active: updated.isActive,
    labels: updated.labels,
    purchasePerKg: purchasePaise != null ? purchasePaise / 100 : null,
    marginPct: margin,
    prices,
  });
}
