import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSettings } from "@/lib/queries";
import { SETTINGS } from "@/lib/constants";
import { consolidateOrders } from "@/lib/requirements";
import { formatKg } from "@/lib/box";
import { Button } from "@/components/ui/button";
import { PrintButton } from "@/components/admin/print-button";

export const metadata: Metadata = { title: "Consolidated requirements" };

type Props = { searchParams: Promise<{ ids?: string }> };

// Print-friendly consolidation of what must be prepared/bought to fulfil the
// selected orders. "Save as PDF" in the browser's print dialog produces the
// shareable PDF (same approach as the invoice and shipping slips).
export default async function RequirementsReportPage({ searchParams }: Props) {
  const { ids } = await searchParams;
  const [{ orders, lines }, settings] = await Promise.all([
    consolidateOrders((ids ?? "").split(",")),
    getSettings(),
  ]);

  const totalPacks = lines.reduce((s, l) => s + l.packs, 0);
  // Unit goods (per-unit cost, e.g. merchandise) don't contribute a weight
  const weightedLines = lines.filter((l) => !(l.unitCost != null && l.unitCost > 0));
  const totalKg = weightedLines.reduce((s, l) => s + (l.kg ?? 0), 0);
  const generatedAt = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });

  return (
    <div className="print-sheet space-y-5">
      <div className="no-print flex flex-wrap items-start justify-between gap-3">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-2">
            <Link href="/admin/orders">
              <ArrowLeft className="size-4" /> Orders
            </Link>
          </Button>
          <h1 className="mt-2 font-heading text-2xl font-bold">Consolidated requirements</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Everything needed to fulfil the selected orders, packs summed per
            product. Use the print dialog&apos;s &ldquo;Save as PDF&rdquo; to get
            a shareable PDF.
          </p>
        </div>
        <PrintButton label="Print / Save as PDF" />
      </div>

      {lines.length === 0 ? (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
          No items found in the selected orders — they may be cancelled or no
          longer exist. Go back to Orders and select at least one active order.
        </p>
      ) : (
        <div className="mx-auto max-w-2xl space-y-4">
          {/* Report header (also prints) */}
          <div className="border-b pb-3">
            <p className="font-heading text-xl font-bold">
              {settings[SETTINGS.STORE_NAME]} — Requirements
            </p>
            <p className="mt-1 text-sm text-neutral-600">
              Generated {generatedAt} · {orders.length} order
              {orders.length === 1 ? "" : "s"}:{" "}
              {orders.map((o) => o.orderNumber).join(", ")}
            </p>
          </div>

          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-neutral-500">
                <th className="py-2 font-semibold">#</th>
                <th className="py-2 font-semibold">Item</th>
                <th className="py-2 text-right font-semibold">Packs</th>
                <th className="py-2 text-right font-semibold">Pack size</th>
                <th className="py-2 text-right font-semibold">Total weight</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => {
                const unitGood = l.unitCost != null && l.unitCost > 0;
                return (
                  <tr key={`${l.variantId ?? l.description}`} className="border-b border-neutral-100">
                    <td className="py-2 pr-2 text-neutral-500">{i + 1}</td>
                    <td className="py-2 pr-4">
                      {l.description}
                      {!l.variantId && (
                        <span className="ml-1.5 text-xs text-neutral-500">
                          (item no longer in catalogue)
                        </span>
                      )}
                    </td>
                    <td className="py-2 text-right tabular-nums">{l.packs}</td>
                    <td className="py-2 text-right tabular-nums">
                      {unitGood || !l.grams ? "—" : `${l.grams} g`}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {unitGood || l.kg == null ? "—" : formatKg(l.kg)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="font-semibold">
                <td className="py-2" />
                <td className="py-2">Total</td>
                <td className="py-2 text-right tabular-nums">{totalPacks}</td>
                <td className="py-2" />
                <td className="py-2 text-right tabular-nums">{formatKg(totalKg)}</td>
              </tr>
            </tfoot>
          </table>

          <p className="text-xs text-neutral-500">
            Includes free goodies (bought like any stock). Weights from pack
            sizes; unit-priced merchandise counts packs only.
          </p>
        </div>
      )}
    </div>
  );
}
