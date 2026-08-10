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
  Selection,
} from "devextreme-react/data-grid";
import { FileText, PackagePlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

// Orders still in flight — everything except the terminal statuses
const INACTIVE_STATUSES: OrderStatus[] = ["DELIVERED", "CANCELLED"];
const isActive = (r: OrderRow) => !INACTIVE_STATUSES.includes(r.status as OrderStatus);

type StatusFilter = OrderStatus | "ACTIVE" | "ALL";

export function OrdersGrid({ rows }: { rows: OrderRow[] }) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ACTIVE");
  // Selected order ids — kept across status-chip changes so the admin can
  // gather orders from several views into one purchase order.
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const countByStatus = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  const filteredRows =
    statusFilter === "ALL"
      ? rows
      : statusFilter === "ACTIVE"
        ? rows.filter(isActive)
        : rows.filter((r) => r.status === statusFilter);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
      {/* Quick status filters */}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setStatusFilter("ACTIVE")}>
          <Badge
            variant={statusFilter === "ACTIVE" ? "default" : "outline"}
            className={cn("px-3 py-1.5", statusFilter !== "ACTIVE" && "hover:bg-accent")}
          >
            Active ({rows.filter(isActive).length})
          </Badge>
        </button>
        <button type="button" onClick={() => setStatusFilter("ALL")}>
          <Badge
            variant={statusFilter === "ALL" ? "default" : "outline"}
            className={cn("px-3 py-1.5", statusFilter !== "ALL" && "hover:bg-accent")}
          >
            All ({rows.length})
          </Badge>
        </button>
        {ORDER_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter((cur) => (cur === s ? "ACTIVE" : s))}
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
      {selectedIds.length > 0 && (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              router.push(`/admin/orders/requirements?ids=${selectedIds.join(",")}`)
            }
          >
            <FileText className="size-4" /> Requirements report ({selectedIds.length})
          </Button>
          <Button
            size="sm"
            onClick={() =>
              router.push(`/admin/purchases?fromOrders=${selectedIds.join(",")}`)
            }
          >
            <PackagePlus className="size-4" /> Create purchase order ({selectedIds.length})
          </Button>
        </div>
      )}
      </div>

    <DataGrid
      dataSource={filteredRows}
      keyExpr="id"
      showBorders
      columnAutoWidth
      rowAlternationEnabled
      hoverStateEnabled
      selectedRowKeys={selectedIds}
      onSelectionChanged={(e) => setSelectedIds(e.selectedRowKeys as string[])}
      onRowClick={(e) => {
        // Clicking the selection checkbox also fires rowClick — don't navigate
        if ((e.event?.target as HTMLElement | null)?.closest?.(".dx-command-select")) return;
        router.push(`/admin/orders/${e.data.id}`);
      }}
    >
      <Selection mode="multiple" showCheckBoxesMode="always" allowSelectAll />
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
