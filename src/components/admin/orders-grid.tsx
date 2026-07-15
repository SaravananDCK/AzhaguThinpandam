"use client";

import "@/components/admin/dx-setup";
import { useRouter } from "next/navigation";
import { useState } from "react";
import DataGrid, {
  Column,
  FilterRow,
  HeaderFilter,
  Lookup,
  Pager,
  Paging,
  SearchPanel,
} from "devextreme-react/data-grid";
import { Badge } from "@/components/ui/badge";
import { ORDER_STATUSES, ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/constants";
import { cn } from "@/lib/utils";

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
  const [statusFilter, setStatusFilter] = useState<OrderStatus | null>(null);

  const countByStatus = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* Quick status filters */}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setStatusFilter(null)}>
          <Badge
            variant={!statusFilter ? "default" : "outline"}
            className={cn("px-3 py-1.5", statusFilter && "hover:bg-accent")}
          >
            All ({rows.length})
          </Badge>
        </button>
        {ORDER_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter((cur) => (cur === s ? null : s))}
          >
            <Badge
              variant={statusFilter === s ? "default" : "outline"}
              className={cn("px-3 py-1.5", statusFilter !== s && "hover:bg-accent")}
            >
              {ORDER_STATUS_LABELS[s]} ({countByStatus[s] ?? 0})
            </Badge>
          </button>
        ))}
      </div>

    <DataGrid
      dataSource={statusFilter ? rows.filter((r) => r.status === statusFilter) : rows}
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
      <Column
        dataField="payment"
        caption="Payment"
        width={125}
        cellRender={({ value }: { value: string }) => (
          <Badge
            variant={
              value === "CAPTURED" ? "secondary" : value === "FAILED" ? "destructive" : "outline"
            }
          >
            {value}
          </Badge>
        )}
      />
      <Column dataField="status" width={155} cellRender={({ value }: { value: string }) => (
        <Badge variant="outline">
          {ORDER_STATUS_LABELS[value as OrderStatus] ?? value}
        </Badge>
      )}>
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
    </div>
  );
}
