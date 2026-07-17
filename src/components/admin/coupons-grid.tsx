"use client";

import "@/components/admin/dx-setup";
import { useMemo } from "react";
import DataGrid, {
  Column,
  Editing,
  Form,
  Lookup,
  Pager,
  Paging,
  Popup,
  RequiredRule,
} from "devextreme-react/data-grid";
import { Item } from "devextreme-react/form";
import CustomStore from "devextreme/data/custom_store";
import { Badge } from "@/components/ui/badge";

const TYPE_OPTIONS = [
  { id: "PERCENT", name: "Percentage %" },
  { id: "FLAT", name: "Flat ₹" },
];

async function apiJson(url: string, init?: RequestInit) {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...init });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return res.json();
}

export function CouponsGrid() {
  const store = useMemo(
    () =>
      new CustomStore({
        key: "id",
        loadMode: "raw",
        load: () => apiJson("/api/admin/coupons"),
        insert: (values) =>
          apiJson("/api/admin/coupons", { method: "POST", body: JSON.stringify(values) }),
        update: (key: string, values) =>
          apiJson(`/api/admin/coupons/${key}`, { method: "PUT", body: JSON.stringify(values) }),
        remove: (key: string) =>
          apiJson(`/api/admin/coupons/${key}`, { method: "DELETE" }).then(() => undefined),
      }),
    []
  );

  return (
    <DataGrid dataSource={store} showBorders columnAutoWidth rowAlternationEnabled repaintChangesOnly>
      <Paging defaultPageSize={25} />
      <Pager showInfo allowedPageSizes={[25, 50]} showPageSizeSelector />
      <Editing mode="popup" allowAdding allowUpdating allowDeleting useIcons>
        <Popup title="Coupon" showTitle width={540} height="auto" />
        <Form>
          <Item itemType="group" colCount={2} colSpan={2}>
            <Item dataField="code" />
            <Item dataField="isActive" />
            <Item dataField="type" />
            <Item dataField="value" />
            <Item dataField="maxDiscount" />
            <Item dataField="minOrder" />
            <Item dataField="perCustomerLimit" />
            <Item dataField="startsAt" />
            <Item dataField="endsAt" />
          </Item>
        </Form>
      </Editing>

      <Column dataField="code" caption="Code" width={140}>
        <RequiredRule />
      </Column>
      <Column dataField="type" caption="Type" width={130}>
        <Lookup dataSource={TYPE_OPTIONS} valueExpr="id" displayExpr="name" />
        <RequiredRule />
      </Column>
      <Column dataField="value" caption="Value (% or ₹)" dataType="number" width={120}>
        <RequiredRule />
      </Column>
      <Column dataField="maxDiscount" caption="Max off ₹" dataType="number" width={110} />
      <Column dataField="minOrder" caption="Min order ₹" dataType="number" width={110} />
      <Column dataField="perCustomerLimit" caption="Per-customer" dataType="number" width={130} />
      <Column dataField="startsAt" caption="Starts" dataType="date" width={110} />
      <Column dataField="endsAt" caption="Ends" dataType="date" width={110} />
      <Column
        dataField="isActive"
        caption="Active"
        dataType="boolean"
        width={90}
        cellRender={({ value }: { value: boolean }) =>
          value ? <Badge variant="outline">Active</Badge> : <Badge variant="secondary">Off</Badge>
        }
      />
      <Column
        dataField="redemptions"
        caption="Used"
        dataType="number"
        width={80}
        allowEditing={false}
        formItem={{ visible: false }}
      />
    </DataGrid>
  );
}
