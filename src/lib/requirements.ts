import { prisma } from "@/lib/prisma";
import { labelToGrams } from "@/lib/pack";

// Consolidates the items of a set of orders into what must be bought/packed to
// fulfil them: packs summed per variant across orders. Shared by the
// pre-filled purchase draft and the printable requirements report. Freebie
// (goodie) lines are included — free for the customer, not for the store.

export type ConsolidatedLine = {
  /** null = the variant was deleted; only the name/label snapshot survives */
  variantId: string | null;
  description: string;
  packs: number;
  /** Per-pack weight in grams, when known */
  grams: number | null;
  /** packs × grams, in kg — null for unit goods / unknown weights */
  kg: number | null;
  /** Per-unit wholesale cost in paise (merchandise), when set */
  unitCost: number | null;
  /** Wholesale ₹/kg in paise, when set */
  pricePerKgPaise: number | null;
  /**
   * Which group this line belongs to, for filtering the printed report:
   * a category slug for snacks, MERCH_GROUP for merchandise (magnets aren't
   * made in the kitchen), UNGROUPED when the variant was deleted and only a
   * name snapshot survives.
   */
  group: string;
  /** Human label for `group`. */
  groupName: string;
};

/** Non-snack lines (merchandise) share one group — they're bought, not made. */
export const MERCH_GROUP = "__merch";
/** Lines whose product is gone, so they can't be classified. */
export const UNGROUPED = "__other";

export type Consolidation = {
  orders: { id: string; orderNumber: string; shipName: string; createdAt: Date }[];
  lines: ConsolidatedLine[];
};

/** Cancelled orders are excluded — no goods need buying for them. */
export async function consolidateOrders(orderIds: string[]): Promise<Consolidation> {
  const ids = [...new Set(orderIds.filter(Boolean))].slice(0, 100);
  if (!ids.length) return { orders: [], lines: [] };
  const orders = await prisma.order.findMany({
    where: { id: { in: ids }, status: { not: "CANCELLED" } },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      orderNumber: true,
      shipName: true,
      createdAt: true,
      items: {
        select: {
          productName: true,
          variantLabel: true,
          qty: true,
          variant: {
            select: {
              id: true,
              label: true,
              weightGrams: true,
              unitCost: true,
              product: {
                select: {
                  name: true,
                  purchasePricePerKg: true,
                  line: true,
                  category: { select: { name: true, slug: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  type Linked = {
    packs: number;
    variant: NonNullable<(typeof orders)[number]["items"][number]["variant"]>;
  };
  const byVariant = new Map<string, Linked>();
  const legacy = new Map<string, { packs: number; description: string; label: string }>();
  for (const o of orders) {
    for (const it of o.items) {
      if (it.variant) {
        const e = byVariant.get(it.variant.id) ?? { packs: 0, variant: it.variant };
        e.packs += it.qty;
        byVariant.set(it.variant.id, e);
      } else {
        const key = `${it.productName}|${it.variantLabel}`;
        const e = legacy.get(key) ?? {
          packs: 0,
          description: `${it.productName} (${it.variantLabel})`,
          label: it.variantLabel,
        };
        e.packs += it.qty;
        legacy.set(key, e);
      }
    }
  }

  const lines: ConsolidatedLine[] = [
    ...[...byVariant.values()].map(({ packs, variant: v }) => {
      const grams = v.weightGrams ?? labelToGrams(v.label);
      return {
        variantId: v.id,
        description: `${v.product.name} (${v.label})`,
        packs,
        grams,
        kg: grams ? (packs * grams) / 1000 : null,
        unitCost: v.unitCost,
        pricePerKgPaise: v.product.purchasePricePerKg,
        // Merchandise is bought in, not made, so it groups on its own rather
        // than under whichever category it happens to sit in.
        group: v.product.line === "SNACKS" ? v.product.category.slug : MERCH_GROUP,
        groupName: v.product.line === "SNACKS" ? v.product.category.name : "Merchandise",
      };
    }),
    ...[...legacy.values()].map(({ packs, description, label }) => {
      const grams = labelToGrams(label);
      return {
        variantId: null,
        description,
        packs,
        grams,
        kg: grams ? (packs * grams) / 1000 : null,
        unitCost: null,
        pricePerKgPaise: null,
        group: UNGROUPED,
        groupName: "Uncategorised",
      };
    }),
  ].sort((a, b) => a.description.localeCompare(b.description));

  return {
    orders: orders.map(({ id, orderNumber, shipName, createdAt }) => ({
      id,
      orderNumber,
      shipName,
      createdAt,
    })),
    lines,
  };
}
