"use client";

import "@/components/admin/dx-setup";
import { useMemo } from "react";
import DataGrid, {
  Column,
  FilterRow,
  Lookup,
  Pager,
  Paging,
  SearchPanel,
} from "devextreme-react/data-grid";
import CustomStore from "devextreme/data/custom_store";
import { STOCK_REASON_LABELS } from "@/lib/stock";

const REASON_LOOKUP = Object.entries(STOCK_REASON_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export function StockGrid() {
  const store = useMemo(
    () =>
      new CustomStore({
        key: "id",
        loadMode: "raw",
        load: async () => {
          const res = await fetch("/api/admin/stock");
          if (!res.ok) throw new Error("Failed to load stock movements");
          return res.json();
        },
      }),
    []
  );

  return (
    <DataGrid dataSource={store} showBorders columnAutoWidth rowAlternationEnabled>
      <FilterRow visible />
      <SearchPanel visible width={240} placeholder="Search product…" />
      <Paging defaultPageSize={20} />
      <Pager showInfo showNavigationButtons />
      <Column
        dataField="createdAt"
        caption="When"
        dataType="datetime"
        defaultSortOrder="desc"
        format="dd MMM yyyy, HH:mm"
        width={170}
      />
      <Column dataField="product" />
      <Column dataField="pack" width={90} />
      <Column
        dataField="delta"
        caption="Change"
        width={100}
        cellRender={({ value }: { value: number }) => (
          <span className={value > 0 ? "font-semibold text-green-600" : "font-semibold text-red-600"}>
            {value > 0 ? `+${value}` : value}
          </span>
        )}
      />
      <Column dataField="balanceAfter" caption="Balance" width={100} />
      <Column dataField="reason" width={190}>
        <Lookup dataSource={REASON_LOOKUP} valueExpr="value" displayExpr="label" />
      </Column>
      <Column dataField="reference" caption="Reference" width={140} />
      <Column dataField="note" />
    </DataGrid>
  );
}
