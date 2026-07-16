"use client";

import "@/components/admin/dx-setup";
import Link from "next/link";
import DataGrid, {
  Column,
  FilterRow,
  HeaderFilter,
  MasterDetail,
  Pager,
  Paging,
  SearchPanel,
} from "devextreme-react/data-grid";
import { Badge } from "@/components/ui/badge";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/constants";

export type CustomerRow = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  joined: string;
  orderCount: number;
  totalSpentRupees: number;
  lastOrder: string | null;
  recentOrders: {
    id: string;
    orderNumber: string;
    totalRupees: number;
    status: string;
    createdAt: string;
  }[];
};

export function CustomersGrid({ rows }: { rows: CustomerRow[] }) {
  return (
    <DataGrid
      dataSource={rows}
      keyExpr="id"
      showBorders
      columnAutoWidth
      rowAlternationEnabled
    >
      <FilterRow visible />
      <HeaderFilter visible />
      <SearchPanel visible width={240} placeholder="Search customers…" />
      <Paging defaultPageSize={20} />
      <Pager showInfo showNavigationButtons allowedPageSizes={[20, 50, 100]} showPageSizeSelector />
      <Column
        dataField="name"
        caption="Customer"
        cellRender={({ data }: { data: CustomerRow }) => (
          <span className="font-medium">{data.name ?? <span className="text-muted-foreground">No name yet</span>}</span>
        )}
      />
      <Column dataField="phone" width={135} allowHeaderFiltering={false} />
      <Column dataField="email" allowHeaderFiltering={false} />
      <Column
        dataField="orderCount"
        caption="Orders"
        width={95}
        dataType="number"
        allowHeaderFiltering={false}
      />
      <Column
        dataField="totalSpentRupees"
        caption="Total spent"
        width={130}
        dataType="number"
        defaultSortOrder="desc"
        format={{ type: "currency", currency: "INR", useCurrencyAccountingStyle: false }}
        allowHeaderFiltering={false}
      />
      <Column
        dataField="lastOrder"
        caption="Last order"
        dataType="date"
        format="dd MMM yyyy"
        width={125}
        allowHeaderFiltering={false}
      />
      <Column
        dataField="joined"
        caption="Joined"
        dataType="date"
        format="dd MMM yyyy"
        width={125}
        allowHeaderFiltering={false}
      />
      <MasterDetail
        enabled
        render={({ data }: { data: CustomerRow }) =>
          data.recentOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No orders yet.</p>
          ) : (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Recent orders
              </p>
              {data.recentOrders.map((o) => (
                <Link
                  key={o.id}
                  href={`/admin/orders/${o.id}`}
                  className="flex max-w-xl items-center justify-between rounded-lg border p-2 text-sm transition-colors hover:bg-accent"
                >
                  <span className="font-mono font-medium text-primary">{o.orderNumber}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(o.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  <span className="font-medium">₹{o.totalRupees.toLocaleString("en-IN")}</span>
                  <Badge variant="outline">
                    {ORDER_STATUS_LABELS[o.status as OrderStatus] ?? o.status}
                  </Badge>
                </Link>
              ))}
            </div>
          )
        }
      />
    </DataGrid>
  );
}
