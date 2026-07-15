"use client";

import "@/components/admin/dx-setup";
import { useMemo } from "react";
import DataGrid, {
  Column,
  Editing,
  Lookup,
  Paging,
  Pager,
  Summary,
  TotalItem,
} from "devextreme-react/data-grid";
import CustomStore from "devextreme/data/custom_store";
import { EXPENSE_CATEGORIES } from "@/lib/constants";

// Grid works in rupees; the API stores paise.
type ExpenseRow = {
  id: string;
  date: string | Date;
  category: string;
  description: string | null;
  amountRupees: number;
};

async function apiJson(url: string, init?: RequestInit) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return res.json();
}

function toApi(values: Partial<ExpenseRow>) {
  const out: Record<string, unknown> = {};
  if (values.date !== undefined) out.date = values.date;
  if (values.category !== undefined) out.category = values.category;
  if (values.description !== undefined) out.description = values.description ?? "";
  if (values.amountRupees !== undefined) out.amount = Math.round(values.amountRupees * 100);
  return out;
}

export function ExpensesGrid() {
  const store = useMemo(
    () =>
      new CustomStore({
        key: "id",
        load: async () => {
          const rows = (await apiJson("/api/admin/expenses")) as Array<
            Omit<ExpenseRow, "amountRupees"> & { amount: number }
          >;
          return rows.map(({ amount, ...rest }) => ({
            ...rest,
            amountRupees: amount / 100,
          }));
        },
        insert: async (values: Partial<ExpenseRow>) =>
          apiJson("/api/admin/expenses", {
            method: "POST",
            body: JSON.stringify({
              date: values.date ?? new Date(),
              category: values.category ?? "Other",
              ...toApi(values),
            }),
          }),
        update: async (key: string, values: Partial<ExpenseRow>) =>
          apiJson(`/api/admin/expenses/${key}`, {
            method: "PUT",
            body: JSON.stringify(toApi(values)),
          }),
        remove: async (key: string) => {
          await apiJson(`/api/admin/expenses/${key}`, { method: "DELETE" });
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
    >
      <Editing mode="row" allowAdding allowUpdating allowDeleting useIcons />
      <Paging defaultPageSize={15} />
      <Pager showInfo showNavigationButtons />
      <Column
        dataField="date"
        dataType="date"
        defaultSortOrder="desc"
        width={130}
        format="dd MMM yyyy"
      />
      <Column dataField="category" width={190}>
        <Lookup dataSource={[...EXPENSE_CATEGORIES]} />
      </Column>
      <Column dataField="description" />
      <Column
        dataField="amountRupees"
        caption="Amount (₹)"
        dataType="number"
        width={140}
        format={{ type: "fixedPoint", precision: 2 }}
      />
      <Summary>
        <TotalItem
          column="amountRupees"
          summaryType="sum"
          displayFormat="Total: ₹{0}"
          valueFormat={{ type: "fixedPoint", precision: 2 }}
        />
      </Summary>
    </DataGrid>
  );
}
