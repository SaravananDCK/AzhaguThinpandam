"use client";

import "@/components/admin/dx-setup";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import DataGrid, {
  Column,
  Export,
  FilterBuilderPopup,
  FilterPanel,
  FilterRow,
  HeaderFilter,
  Lookup,
  Pager,
  Paging,
  SearchPanel,
  Selection,
} from "devextreme-react/data-grid";
import { FileText, PackagePlus } from "lucide-react";
import { exportGrid } from "@/components/admin/grid-export";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ORDER_STATUSES, ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/constants";
import { ordinalLabel } from "@/lib/ordinal";
import { cn } from "@/lib/utils";

export type OrderRow = {
  id: string;
  orderNumber: string;
  customer: string;
  /** Position among this customer's paid orders: 1 = first-time buyer, 2+ = repeat */
  customerOrdinal: number;
  /** False for unpaid/cancelled rows — the ordinal is then the position it would take */
  countsAsPaid: boolean;
  phone: string;
  items: number;
  totalRupees: number;
  /** What the courier charged us — 0 means nobody has entered it yet */
  courierCostRupees: number;
  /** Goods + shipping income − today's wholesale cost − packing − courier (rupees) */
  marginRupees: number;
  /** Margin as % of goods revenue; null when there was no goods revenue */
  marginPct: number | null;
  /** Some lines have no wholesale price or the courier cost isn't recorded — the margin is overstated */
  marginIncomplete: boolean;
  payment: string;
  status: string;
  /** What the customer (or the admin) typed at checkout; "" when there is none */
  notes: string;
  createdAt: string;
};

const STATUS_LOOKUP = Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => ({
  value,
  label,
}));

// Orders still in flight — everything except the terminal statuses
const INACTIVE_STATUSES: OrderStatus[] = ["DELIVERED", "CANCELLED"];
const isActive = (r: OrderRow) => !INACTIVE_STATUSES.includes(r.status as OrderStatus);

/**
 * The status chips are shortcuts that write the grid's own filter, so whatever
 * they do shows up in the filter panel and can be widened from there — pick two
 * statuses, add a date range, drop the status part. Everything is one filter
 * expression; nothing filters the rows behind the grid's back.
 */
const ACTIVE_FILTER: unknown[] = [
  ["status", "<>", "DELIVERED"],
  "and",
  ["status", "<>", "CANCELLED"],
];
const statusFilterFor = (s: OrderStatus): unknown[] => ["status", "=", s];
const sameFilter = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export function OrdersGrid({ rows }: { rows: OrderRow[] }) {
  const router = useRouter();
  const [filterValue, setFilterValue] = useState<unknown[] | null>(ACTIVE_FILTER);
  // Selected order ids — kept across status-chip changes so the admin can
  // gather orders from several views into one purchase order.
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const countByStatus = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  // Real Dates, so the grid's date editors and the "between" range operator
  // work on values rather than on ISO strings.
  const gridRows = useMemo(
    () => rows.map((r) => ({ ...r, createdAt: new Date(r.createdAt) })),
    [rows]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
      {/* Quick status filters */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: "ACTIVE", label: `Active (${rows.filter(isActive).length})`, filter: ACTIVE_FILTER },
          { key: "ALL", label: `All (${rows.length})`, filter: null },
          ...ORDER_STATUSES.map((s) => ({
            key: s,
            label: `${ORDER_STATUS_LABELS[s]} (${countByStatus[s] ?? 0})`,
            filter: statusFilterFor(s),
          })),
        ].map((chip) => {
          const on = sameFilter(filterValue, chip.filter);
          return (
            <button
              key={chip.key}
              type="button"
              // Tapping the active chip again falls back to Active, the way it
              // did before the panel existed.
              onClick={() => setFilterValue(on && chip.key !== "ACTIVE" ? ACTIVE_FILTER : chip.filter)}
            >
              <Badge
                variant={on ? "default" : "outline"}
                className={cn("px-3 py-1.5", !on && "hover:bg-accent")}
              >
                {chip.label}
              </Badge>
            </button>
          );
        })}
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
      dataSource={gridRows}
      keyExpr="id"
      onExporting={exportGrid("orders")}
      filterValue={filterValue as unknown[]}
      onFilterValueChange={(v) => setFilterValue((v as unknown[] | null) ?? null)}
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
      <Export enabled />
      {/* Shows the whole filter as text under the toolbar, with a Clear link
          and the filter builder for anything the header row can't express —
          two statuses at once, a date range plus a payment state. */}
      <FilterPanel visible />
      <FilterBuilderPopup width={620} height={420} title="Filter orders" />
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
      {/* Repeat buyers at a glance: filled badge from the 2nd paid order on.
          Untick "1" in the header filter for repeat customers only. Muted on
          unpaid rows, where it is the position the order would take. */}
      <Column
        dataField="customerOrdinal"
        caption="Nth order"
        width={105}
        dataType="number"
        alignment="left"
        cellRender={({ value, data }: { value: number; data: OrderRow }) => (
          <Badge
            variant={value > 1 ? "secondary" : "outline"}
            className={cn(!data.countsAsPaid && "opacity-50")}
            title={
              data.countsAsPaid
                ? value > 1
                  ? `Repeat customer — their ${ordinalLabel(value)} paid order`
                  : "First paid order from this customer"
                : `Not paid yet — would be their ${ordinalLabel(value)} order`
            }
          >
            {ordinalLabel(value)}
          </Badge>
        )}
      />
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
      {/* Internal courier cost. Zero means it was never entered, which is not
          the same as a free delivery — show it blank rather than ₹0.00. */}
      <Column
        dataField="courierCostRupees"
        caption="Courier cost"
        width={130}
        dataType="number"
        format={{ type: "currency", currency: "INR", useCurrencyAccountingStyle: false }}
        allowHeaderFiltering={false}
        cellRender={({ value, text }: { value: number; text: string }) =>
          value > 0 ? <span>{text}</span> : <span className="text-muted-foreground">—</span>
        }
      />
      {/* Internal margin: what the order earned over today's wholesale cost,
          packing and courier. Red when the order lost money; an asterisk when
          part of the cost is unknown, so the figure is optimistic. */}
      <Column
        dataField="marginRupees"
        caption="Margin"
        width={120}
        dataType="number"
        format={{ type: "currency", currency: "INR", useCurrencyAccountingStyle: false }}
        allowHeaderFiltering={false}
        cellRender={({ value, text, data }: { value: number; text: string; data: OrderRow }) => (
          <span
            className={cn(value < 0 && "font-medium text-destructive")}
            title={
              data.marginIncomplete
                ? "Some cost is unknown (unpriced items or no courier cost yet) — the real margin is lower"
                : undefined
            }
          >
            {text}
            {data.marginIncomplete && <span className="text-muted-foreground">*</span>}
          </span>
        )}
      />
      <Column
        dataField="marginPct"
        caption="Margin %"
        width={100}
        dataType="number"
        format={{ type: "fixedPoint", precision: 1 }}
        allowHeaderFiltering={false}
        cellRender={({ value, text }: { value: number | null; text: string }) =>
          value == null ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            <span className={cn(value < 0 && "font-medium text-destructive")}>{text}%</span>
          )
        }
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
      {/* One line here, the whole note in the tooltip and on the order page */}
      <Column
        dataField="notes"
        caption="Notes"
        width={220}
        allowHeaderFiltering={false}
        cellRender={({ value }: { value: string }) =>
          value ? (
            <span className="block truncate text-muted-foreground" title={value}>
              {value}
            </span>
          ) : null
        }
      />
      {/* Opens on "between" so the filter row is a date range straight away;
          the header filter still gives the year/month/day tree. */}
      <Column
        dataField="createdAt"
        caption="Date"
        dataType="datetime"
        defaultSortOrder="desc"
        format="dd MMM, HH:mm"
        width={190}
        filterOperations={["between", ">=", "<=", "=", "<>"]}
        defaultSelectedFilterOperation="between"
      />
    </DataGrid>
    </div>
  );
}
