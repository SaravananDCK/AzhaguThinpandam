"use client";

import "@/components/admin/dx-setup";
import { useMemo, useRef, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import DataGrid, {
  Column,
  Editing,
  FilterRow,
  HeaderFilter,
  Pager,
  Paging,
  SearchPanel,
} from "devextreme-react/data-grid";
import CustomStore from "devextreme/data/custom_store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type PricingRow = {
  id: string;
  name: string;
  category: string;
  active: boolean;
  purchasePerKg: number | null; // rupees
  marginPct: number | null;
  prices: string;
};

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
  const gridRef = useRef<GridInstance | null>(null);

  const store = useMemo(
    () =>
      new CustomStore({
        key: "id",
        loadMode: "raw",
        load: () => apiJson("/api/admin/pricing"),
        update: (key: string, values: Partial<PricingRow>) => {
          const body: Record<string, unknown> = {};
          if (values.purchasePerKg !== undefined) body.purchasePerKg = values.purchasePerKg;
          if (values.marginPct !== undefined) body.marginPct = values.marginPct;
          return apiJson(`/api/admin/pricing/${key}`, {
            method: "PUT",
            body: JSON.stringify(body),
          });
        },
      }),
    []
  );

  async function recalculateAll() {
    setRecalculating(true);
    try {
      const res = await apiJson("/api/admin/pricing/recalculate", {
        method: "POST",
        body: JSON.stringify({ roundToFive }),
      });
      await gridRef.current?.refresh();
      toast.success(
        `Recalculated ${res.productsUpdated} product${res.productsUpdated === 1 ? "" : "s"} ` +
          `(${res.variantsUpdated} pack prices) ${roundToFive ? "rounded up to ₹5" : "exact to ₹1"}.`
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Recalculation failed.");
    } finally {
      setRecalculating(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/40 px-4 py-3">
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
        <Button onClick={recalculateAll} disabled={recalculating} size="sm">
          {recalculating ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          Recalculate all prices
        </Button>
      </div>

      <DataGrid
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
          dataField="prices"
          caption="Sale prices"
          allowEditing={false}
          allowFiltering={false}
          allowSorting={false}
        />
      </DataGrid>
    </div>
  );
}
