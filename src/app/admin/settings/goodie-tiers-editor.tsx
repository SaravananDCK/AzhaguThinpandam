"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { GoodieTier } from "@/lib/box";

export type GoodieVariantOption = {
  id: string;
  label: string;
  stock: number;
  madeToOrder: boolean;
};

type Row = { kg: string; variantId: string; qty: string };

/**
 * Editor for the goodie tiers: rows of [kg threshold → item → qty]. Lives
 * inside the uncontrolled settings form — rows serialize into a single hidden
 * `goodieTiers` input (JSON) that the existing submit path picks up as-is.
 */
export function GoodieTiersEditor({
  initial,
  variants,
}: {
  initial: GoodieTier[];
  variants: GoodieVariantOption[];
}) {
  const [rows, setRows] = useState<Row[]>(() =>
    initial.length
      ? initial.map((g) => ({ kg: String(g.kg), variantId: g.variantId, qty: String(g.qty) }))
      : [{ kg: "", variantId: "", qty: "1" }]
  );

  const valid = rows.flatMap((r) => {
    const kg = parseFloat(r.kg);
    const qty = parseInt(r.qty, 10);
    if (!(kg > 0) || !r.variantId || !(qty >= 1)) return [];
    return [{ kg, variantId: r.variantId, qty }];
  });

  function patch(idx: number, part: Partial<Row>) {
    setRows((rs) => rs.map((r, i) => (i === idx ? { ...r, ...part } : r)));
  }

  return (
    <div className="space-y-2">
      <input type="hidden" name="goodieTiers" value={JSON.stringify(valid)} />
      {rows.map((row, idx) => {
        const chosen = variants.find((v) => v.id === row.variantId);
        return (
          <div key={idx} className="space-y-1">
            <div className="grid grid-cols-[72px_1fr_56px_32px] items-center gap-2">
              <Input
                type="number"
                min="0.25"
                step="0.25"
                placeholder="kg"
                aria-label="Weight threshold in kg"
                value={row.kg}
                onChange={(e) => patch(idx, { kg: e.target.value })}
              />
              <select
                className="h-9 rounded-md border bg-background px-2 text-sm"
                aria-label="Free item"
                value={row.variantId}
                onChange={(e) => patch(idx, { variantId: e.target.value })}
              >
                <option value="">Pick an item…</option>
                {variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}{" "}
                    {v.madeToOrder ? "(made to order)" : `(${v.stock} in stock)`}
                  </option>
                ))}
              </select>
              <Input
                type="number"
                min="1"
                max="99"
                aria-label="Quantity"
                value={row.qty}
                onChange={(e) => patch(idx, { qty: e.target.value })}
              />
              <button
                type="button"
                className="rounded p-1.5 text-muted-foreground hover:text-destructive"
                onClick={() => setRows((rs) => rs.filter((_, i) => i !== idx))}
                disabled={rows.length === 1}
                aria-label="Remove goodie"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
            {chosen && !chosen.madeToOrder && chosen.stock <= 0 && (
              <p className="text-xs text-destructive">
                Out of stock — this goodie is skipped until restocked.
              </p>
            )}
          </div>
        );
      })}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setRows((rs) => [...rs, { kg: "", variantId: "", qty: "1" }])}
      >
        <Plus className="size-3.5" /> Add goodie
      </Button>
    </div>
  );
}
