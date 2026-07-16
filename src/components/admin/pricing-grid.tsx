"use client";

import "@/components/admin/dx-setup";
import { useMemo } from "react";
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

type PricingRow = {
  id: string;
  name: string;
  category: string;
  active: boolean;
  purchasePerKg: number | null; // rupees
  marginPct: number | null;
  prices: string;
};

async function apiJson(url: string, init?: RequestInit) {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...init });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return res.json();
}

export function PricingGrid() {
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

  return (
    <DataGrid
      dataSource={store}
      showBorders
      columnAutoWidth
      rowAlternationEnabled
      repaintChangesOnly
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
  );
}
