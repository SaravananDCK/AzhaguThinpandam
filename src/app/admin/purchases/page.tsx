import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { labelToGrams } from "@/lib/pack";
import { PurchasesGrid, type PurchaseDraft } from "@/components/admin/purchases-grid";

export const metadata: Metadata = { title: "Purchases" };

/**
 * Consolidates the items of the given orders into a pre-filled purchase draft:
 * packs summed per variant, kg + ₹/kg defaults from the wholesale settings.
 * Nothing is recorded until the admin saves the dialog. Freebie (goodie) lines
 * are included — they're free for the customer, not for the store.
 */
async function buildDraftFromOrders(fromOrders: string): Promise<PurchaseDraft | null> {
  const ids = [...new Set(fromOrders.split(",").filter(Boolean))].slice(0, 100);
  if (!ids.length) return null;
  const orders = await prisma.order.findMany({
    // Cancelled orders need no goods bought — makes a careless select-all safe
    where: { id: { in: ids }, status: { not: "CANCELLED" } },
    orderBy: { createdAt: "asc" },
    select: {
      orderNumber: true,
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
              product: { select: { name: true, purchasePricePerKg: true } },
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
  // Lines whose variant was since deleted — only the name/label snapshot is left
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

  const items = [
    ...[...byVariant.values()].map(({ packs, variant: v }) => {
      const description = `${v.product.name} (${v.label})`;
      // Per-unit wholesale cost wins for merchandise (order-cost.ts precedence)
      if (v.unitCost != null && v.unitCost > 0) {
        return {
          description,
          variantId: v.id,
          packs: String(packs),
          qty: String(packs),
          unitCostRupees: String(v.unitCost / 100),
        };
      }
      const grams = v.weightGrams ?? labelToGrams(v.label);
      return {
        description,
        variantId: v.id,
        packs: String(packs),
        qty: grams ? String((packs * grams) / 1000) : "",
        unitCostRupees: v.product.purchasePricePerKg
          ? String(v.product.purchasePricePerKg / 100)
          : "",
      };
    }),
    // Blank cost on purpose: the admin must price these lines before saving
    ...[...legacy.values()].map(({ packs, description, label }) => {
      const grams = labelToGrams(label);
      return {
        description,
        variantId: "",
        packs: "",
        qty: grams ? String((packs * grams) / 1000) : String(packs),
        unitCostRupees: "",
      };
    }),
  ]
    .sort((a, b) => a.description.localeCompare(b.description))
    .slice(0, 100); // purchaseSchema caps items at 100

  if (!items.length) return null;
  const nums = orders.map((o) => o.orderNumber);
  return {
    note: `For orders ${nums.slice(0, 5).join(", ")}${
      nums.length > 5 ? ` (+${nums.length - 5} more)` : ""
    }`,
    items,
  };
}

export default async function AdminPurchasesPage({
  searchParams,
}: {
  searchParams: Promise<{ fromOrders?: string }>;
}) {
  const { fromOrders } = await searchParams;
  const [variants, suppliers, draft] = await Promise.all([
    prisma.productVariant.findMany({
      where: { isActive: true, product: { isActive: true } },
      include: { product: { select: { name: true, purchasePricePerKg: true } } },
      orderBy: [{ product: { name: "asc" } }, { sortOrder: "asc" }],
    }),
    prisma.supplier.findMany({
      where: { isActive: true },
      select: { id: true, name: true, gstRate: true },
      orderBy: { name: "asc" },
    }),
    fromOrders ? buildDraftFromOrders(fromOrders) : Promise.resolve(null),
  ]);
  const variantOptions = variants.map((v) => ({
    id: v.id,
    name: `${v.product.name} (${v.label})`,
    grams: labelToGrams(v.label), // pack weight, for the kg default
    pricePerKgPaise: v.product.purchasePricePerKg, // wholesale ₹/kg default
  }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-2xl font-bold">Purchases</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Wholesale stock bought from your supplier — counted as cost of goods in
          the P&amp;L. Pick a supplier and GST rate so it feeds payables and the
          input-GST report. Expand a row to see its items.
        </p>
      </div>
      {fromOrders && !draft && (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
          No purchasable items found in the selected orders — they may be
          cancelled or no longer exist.
        </p>
      )}
      <PurchasesGrid
        variantOptions={variantOptions}
        supplierOptions={suppliers}
        draft={draft ?? undefined}
      />
    </div>
  );
}
