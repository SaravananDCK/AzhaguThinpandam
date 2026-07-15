"use client";

import "@/components/admin/dx-setup";
import { useRouter } from "next/navigation";
import DataGrid, {
  Column,
  FilterRow,
  HeaderFilter,
  Lookup,
  Pager,
  Paging,
  SearchPanel,
} from "devextreme-react/data-grid";
import { ORDER_STATUS_LABELS } from "@/lib/constants";

export type OrderRow = {
  id: string;
  orderNumber: string;
  customer: string;
  phone: string;
  items: number;
  totalRupees: number;
  payment: string;
  status: string;
  createdAt: string;
};

const STATUS_LOOKUP = Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export function OrdersGrid({ rows }: { rows: OrderRow[] }) {
  const router = useRouter();

  return (
    <DataGrid
      dataSource={rows}
      keyExpr="id"
      showBorders
      columnAutoWidth
      rowAlternationEnabled
      hoverStateEnabled
      onRowClick={(e) => router.push(`/admin/orders/${e.data.id}`)}
    >
      <FilterRow visible />
      <HeaderFilter visible />
      <SearchPanel visible width={240} placeholder="Search orders…" />
      <Paging defaultPageSize={20} />
      <Pager showInfo showNavigationButtons allowedPageSizes={[20, 50, 100]} showPageSizeSelector />
      <Column
        dataField="orderNumber"
        caption="Order"
        width={150}
        cellRender={({ value }: { value: string }) => (
          <span className="font-mono font-medium text-primary">{value}</span>
        )}
      />
      <Column dataField="customer" />
      <Column dataField="phone" width={130} allowHeaderFiltering={false} />
      <Column dataField="items" caption="Packs" width={85} allowHeaderFiltering={false} />
      <Column
        dataField="totalRupees"
        caption="Total"
        width={110}
        dataType="number"
        format={{ type: "currency", currency: "INR", useCurrencyAccountingStyle: false }}
        allowHeaderFiltering={false}
      />
      <Column dataField="payment" caption="Payment" width={120} />
      <Column dataField="status" width={150}>
        <Lookup dataSource={STATUS_LOOKUP} valueExpr="value" displayExpr="label" />
      </Column>
      <Column
        dataField="createdAt"
        caption="Date"
        dataType="datetime"
        defaultSortOrder="desc"
        format="dd MMM, HH:mm"
        width={140}
        allowHeaderFiltering={false}
      />
    </DataGrid>
  );
}
