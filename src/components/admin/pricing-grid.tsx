"use client";

import "@/components/admin/dx-setup";
import { useMemo, useRef, useState } from "react";
import { Loader2, RefreshCw, Tags } from "lucide-react";
import { toast } from "sonner";
import DataGrid, {
  Column,
  Editing,
  Export,
  FilterRow,
  HeaderFilter,
  Pager,
  Paging,
  SearchPanel,
} from "devextreme-react/data-grid";
import { exportGrid } from "@/components/admin/grid-export";
import CustomStore from "devextreme/data/custom_store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type PricingRow = {
  id: string;
  name: string;
  category: string;
  categoryId: string;
  active: boolean;
  labels: string; // comma-separated
  purchasePerKg: number | null; // rupees
  marginPct: number | null;
  /** "₹90 / ₹175" — editable: type the new prices in the same order */
  prices: string;
};

/** "₹90 / ₹175", "90, 175" or "90 175" → [90, 175]; null when nothing parses. */
function parsePrices(text: string): number[] | null {
  const nums = text
    .split(/[\/,\s]+/)
    .map((s) => s.replace(/[₹]/g, "").trim())
    .filter(Boolean)
    .map(Number);
  if (!nums.length || nums.some((n) => !Number.isFinite(n) || n < 1)) return null;
  return nums;
}

// DevExtreme's grid component instance (only the members we call).
type GridInstance = { refresh: () => Promise<void> };

async function apiJson(url: string, init?: RequestInit) {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...init });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return res.json();
}

export function PricingGrid({ initialRoundToFive }: { initialRoundToFive: boolean }) {
  const [roundToFive, setRoundToFive] = useState(initialRoundToFive);
  const [recalculating, setRecalculating] = useState(false);
  const [bulkMargin, setBulkMargin] = useState("");
  // "Increase by category" popup
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustCategories, setAdjustCategories] = useState<Set<string>>(new Set());
  const [adjustMode, setAdjustMode] = useState<"rupees" | "percent">("rupees");
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjusting, setAdjusting] = useState(false);
  const [rows, setRows] = useState<PricingRow[]>([]);
  const categories = useMemo(() => {
    const seen = new Map<string, string>();
    for (const r of rows) seen.set(r.categoryId, r.category);
    return [...seen.entries()].map(([id, name]) => ({ id, name }));
  }, [rows]);
  const gridRef = useRef<GridInstance | null>(null);

  const store = useMemo(
    () =>
      new CustomStore({
        key: "id",
        loadMode: "raw",
        load: async () => {
          const data = (await apiJson("/api/admin/pricing")) as PricingRow[];
          setRows(data);
          return data;
        },
        update: (key: string, values: Partial<PricingRow>) => {
          const body: Record<string, unknown> = {};
          if (values.purchasePerKg !== undefined) body.purchasePerKg = values.purchasePerKg;
          if (values.marginPct !== undefined) body.marginPct = values.marginPct;
          if (values.labels !== undefined) body.labels = values.labels ?? "";
          if (values.prices !== undefined) {
            const prices = parsePrices(values.prices ?? "");
            if (!prices) throw new Error("Sale prices must be numbers, e.g. 90 / 175.");
            body.prices = prices;
          }
          return apiJson(`/api/admin/pricing/${key}`, {
            method: "PUT",
            body: JSON.stringify(body),
          });
        },
      }),
    []
  );

  async function recalculateAll(setMargin?: number) {
    setRecalculating(true);
    try {
      const res = await apiJson("/api/admin/pricing/recalculate", {
        method: "POST",
        body: JSON.stringify(setMargin != null ? { roundToFive, setMargin } : { roundToFive }),
      });
      await gridRef.current?.refresh();
      toast.success(
        (setMargin != null ? `Set margin to ${setMargin}% and r` : "R") +
          `ecalculated ${res.productsUpdated} product${res.productsUpdated === 1 ? "" : "s"} ` +
          `(${res.variantsUpdated} pack prices)${roundToFive ? ", rounded up to ₹5" : ""}.`
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Recalculation failed.");
    } finally {
      setRecalculating(false);
    }
  }

  async function applyAdjust() {
    const amount = Number(adjustAmount);
    if (!adjustCategories.size || !adjustAmount.trim() || !Number.isFinite(amount) || amount === 0) {
      toast.error("Pick at least one category and a non-zero amount.");
      return;
    }
    setAdjusting(true);
    try {
      const res = await apiJson("/api/admin/pricing/adjust", {
        method: "POST",
        body: JSON.stringify({ categoryIds: [...adjustCategories], mode: adjustMode, amount }),
      });
      await gridRef.current?.refresh();
      toast.success(
        `${amount > 0 ? "Increased" : "Decreased"} ${res.variantsUpdated} pack prices across ${res.productsUpdated} products by ${adjustMode === "rupees" ? `₹${Math.abs(amount)}` : `${Math.abs(amount)}%`}; margins updated.`
      );
      setAdjustOpen(false);
      setAdjustAmount("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Price change failed.");
    } finally {
      setAdjusting(false);
    }
  }

  function applyBulkMargin() {
    const m = Number(bulkMargin);
    if (!bulkMargin.trim() || Number.isNaN(m) || m < 0) {
      toast.error("Enter a valid margin %.");
      return;
    }
    recalculateAll(m);
  }

  return (
    <div className="space-y-3">
      <div className="space-y-3 rounded-lg border bg-muted/40 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={roundToFive}
              onChange={(e) => setRoundToFive(e.target.checked)}
              disabled={recalculating}
              className="size-4 accent-primary"
            />
            Round sale prices UP to the next ₹5 (₹88 → ₹90)
          </label>
          <Button onClick={() => recalculateAll()} disabled={recalculating} size="sm">
            {recalculating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            Recalculate all prices
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          <span className="text-sm font-medium">Set margin for all products:</span>
          <Input
            type="number"
            min="0"
            value={bulkMargin}
            onChange={(e) => setBulkMargin(e.target.value)}
            placeholder="e.g. 75"
            className="h-9 w-24"
            disabled={recalculating}
          />
          <span className="text-sm text-muted-foreground">%</span>
          <Button
            variant="outline"
            size="sm"
            onClick={applyBulkMargin}
            disabled={recalculating || !bulkMargin.trim()}
          >
            Apply to all &amp; recalculate
          </Button>
          <span className="text-xs text-muted-foreground">
            Overwrites every product&apos;s margin and reprices the whole catalog.
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          <Button variant="outline" size="sm" onClick={() => setAdjustOpen(true)} disabled={recalculating}>
            <Tags className="size-4" /> Change prices by category…
          </Button>
          <span className="text-xs text-muted-foreground">
            Add ₹ or % to every pack price in the chosen categories; margins follow.
          </span>
        </div>
      </div>

      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change prices by category</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Categories</Label>
              <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border p-2">
                {categories.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 rounded px-1 py-1 text-sm hover:bg-muted/60">
                    <input
                      type="checkbox"
                      className="size-4 accent-primary"
                      checked={adjustCategories.has(c.id)}
                      onChange={(e) =>
                        setAdjustCategories((prev) => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(c.id);
                          else next.delete(c.id);
                          return next;
                        })
                      }
                    />
                    {c.name}
                  </label>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-3">
              <div className="grid gap-2">
                <Label htmlFor="adj-amount">Change each pack price by</Label>
                <Input
                  id="adj-amount"
                  type="number"
                  step={adjustMode === "rupees" ? "1" : "0.5"}
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  placeholder={adjustMode === "rupees" ? "e.g. 5" : "e.g. 10"}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="adj-mode">Unit</Label>
                <select
                  id="adj-mode"
                  className="h-9 rounded-md border bg-background px-2 text-sm"
                  value={adjustMode}
                  onChange={(e) => setAdjustMode(e.target.value as "rupees" | "percent")}
                >
                  <option value="rupees">₹ per pack</option>
                  <option value="percent">%</option>
                </select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Applies to every pack of every product in those categories, hidden ones
              included. A negative number lowers prices. Purchase ₹/kg stays as it is; each
              product&apos;s Margin % is re-read from its new base-pack price.
            </p>
            <Button onClick={applyAdjust} disabled={adjusting}>
              {adjusting && <Loader2 className="size-4 animate-spin" />} Apply
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <DataGrid
        onExporting={exportGrid("pricing")}
        dataSource={store}
        showBorders
        columnAutoWidth
        rowAlternationEnabled
        repaintChangesOnly
        onInitialized={(e) => {
          gridRef.current = (e.component as unknown as GridInstance) ?? null;
        }}
      >
        <FilterRow visible />
        <HeaderFilter visible />
        <SearchPanel visible width={240} placeholder="Search products…" />
        <Editing mode="batch" allowUpdating startEditAction="click" selectTextOnEditStart />
        <Export enabled />
        <Paging defaultPageSize={50} />
        <Pager showInfo showNavigationButtons allowedPageSizes={[25, 50, 100]} showPageSizeSelector />
        <Column dataField="name" caption="Product" allowEditing={false} />
        <Column dataField="category" width={170} allowEditing={false} />
        <Column
          dataField="active"
          caption="Visible"
          dataType="boolean"
          width={90}
          allowEditing={false}
          cellRender={({ value }: { value: boolean }) =>
            value ? (
              <Badge variant="outline">Live</Badge>
            ) : (
              <Badge variant="secondary">Hidden</Badge>
            )
          }
        />
        <Column
          dataField="purchasePerKg"
          caption="Purchase ₹/kg"
          dataType="number"
          width={140}
          allowHeaderFiltering={false}
          format={{ type: "fixedPoint", precision: 2 }}
        />
        <Column
          dataField="marginPct"
          caption="Margin %"
          dataType="number"
          width={120}
          allowHeaderFiltering={false}
          format={{ type: "fixedPoint", precision: 1 }}
        />
        <Column
          dataField="labels"
          caption="Labels (comma-separated)"
          minWidth={220}
          allowHeaderFiltering={false}
          editorOptions={{ maxLength: 300, placeholder: "No Palm Oil, No Maida" }}
        />
        <Column
          dataField="prices"
          caption="Sale prices"
          allowFiltering={false}
          allowSorting={false}
          minWidth={140}
          editorOptions={{ placeholder: "90 / 175" }}
        />
      </DataGrid>
    </div>
  );
}
