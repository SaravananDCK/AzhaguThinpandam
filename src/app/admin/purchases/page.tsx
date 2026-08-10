import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { labelToGrams } from "@/lib/pack";
import { consolidateOrders } from "@/lib/requirements";
import { PurchasesGrid, type PurchaseDraft } from "@/components/admin/purchases-grid";

export const metadata: Metadata = { title: "Purchases" };

/**
 * Maps a consolidation of the given orders (packs per variant, kg + ₹/kg
 * wholesale defaults) into a pre-filled purchase draft. Nothing is recorded
 * until the admin saves the dialog.
 */
async function buildDraftFromOrders(fromOrders: string): Promise<PurchaseDraft | null> {
  const { orders, lines } = await consolidateOrders(fromOrders.split(","));
  const items = lines
    .map((l) => {
      if (!l.variantId) {
        // Deleted variant: description-only row, no stock link; blank cost on
        // purpose — the admin must price it before saving.
        return {
          description: l.description,
          variantId: "",
          packs: "",
          qty: l.kg != null ? String(l.kg) : String(l.packs),
          unitCostRupees: "",
        };
      }
      // Per-unit wholesale cost wins for merchandise (order-cost.ts precedence)
      if (l.unitCost != null && l.unitCost > 0) {
        return {
          description: l.description,
          variantId: l.variantId,
          packs: String(l.packs),
          qty: String(l.packs),
          unitCostRupees: String(l.unitCost / 100),
        };
      }
      return {
        description: l.description,
        variantId: l.variantId,
        packs: String(l.packs),
        qty: l.kg != null ? String(l.kg) : "",
        unitCostRupees: l.pricePerKgPaise ? String(l.pricePerKgPaise / 100) : "",
      };
    })
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
