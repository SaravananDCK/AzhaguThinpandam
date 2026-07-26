"use client";

import "@/components/admin/dx-setup";
import { useMemo, useRef } from "react";
import DataGrid, {
  Column,
  FilterRow,
  MasterDetail,
  Paging,
  Pager,
} from "devextreme-react/data-grid";
import type { DataGridRef } from "devextreme-react/data-grid";
import CustomStore from "devextreme/data/custom_store";
import { Check, Star, Trash2, X } from "lucide-react";
import { toast } from "sonner";

type ReviewRow = {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  authorName: string | null;
  status: string;
  createdAt: string;
  product: { name: string; slug: string } | null;
  user: { name: string | null; phone: string | null } | null;
};

const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  APPROVED: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
};

export function ReviewsGrid() {
  const gridRef = useRef<DataGridRef>(null);

  const store = useMemo(
    () =>
      new CustomStore({
        key: "id",
        load: async () => {
          const res = await fetch("/api/admin/reviews");
          if (!res.ok) throw new Error("Failed to load reviews");
          return res.json();
        },
      }),
    []
  );

  const refresh = () => gridRef.current?.instance().refresh();

  async function setStatus(id: string, status: string) {
    const res = await fetch(`/api/admin/reviews/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      toast.error("Could not update the review.");
      return;
    }
    toast.success(status === "APPROVED" ? "Review approved" : "Review updated");
    refresh();
  }

  async function remove(id: string) {
    const res = await fetch(`/api/admin/reviews/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Could not delete the review.");
      return;
    }
    toast.success("Review deleted");
    refresh();
  }

  return (
    <DataGrid ref={gridRef} dataSource={store} showBorders columnAutoWidth rowAlternationEnabled>
      <FilterRow visible />
      <Paging defaultPageSize={15} />
      <Pager showInfo showNavigationButtons />
      <Column
        dataField="createdAt"
        caption="Date"
        dataType="date"
        defaultSortOrder="desc"
        format="dd MMM yyyy"
        width={120}
        allowFiltering={false}
      />
      <Column
        caption="Product"
        calculateCellValue={(r: ReviewRow) => r.product?.name ?? "—"}
        width={180}
      />
      <Column
        caption="Customer"
        allowFiltering={false}
        calculateCellValue={(r: ReviewRow) => r.authorName || r.user?.name || r.user?.phone || "—"}
        width={150}
      />
      <Column
        dataField="rating"
        caption="Rating"
        width={120}
        allowFiltering={false}
        cellRender={({ data }: { data: ReviewRow }) => (
          <span className="flex text-gold-500">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                className={`size-3.5 ${n <= data.rating ? "fill-current" : "text-muted-foreground/30"}`}
              />
            ))}
          </span>
        )}
      />
      <Column
        caption="Review"
        allowFiltering={false}
        cellRender={({ data }: { data: ReviewRow }) => (
          <div className="max-w-md whitespace-normal">
            {data.title && <span className="font-medium">{data.title}</span>}
            {data.body && (
              <p className="text-xs text-muted-foreground">{data.body}</p>
            )}
          </div>
        )}
      />
      <Column
        dataField="status"
        caption="Status"
        width={110}
        cellRender={({ data }: { data: ReviewRow }) => (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[data.status] ?? ""}`}
          >
            {data.status}
          </span>
        )}
      />
      <Column
        caption=""
        width={120}
        allowFiltering={false}
        cellRender={({ data }: { data: ReviewRow }) => (
          <span className="flex gap-1">
            {data.status !== "APPROVED" && (
              <button
                type="button"
                className="rounded p-1.5 text-green-700 hover:bg-muted dark:text-green-400"
                onClick={() => setStatus(data.id, "APPROVED")}
                aria-label="Approve review"
                title="Approve"
              >
                <Check className="size-4" />
              </button>
            )}
            {data.status !== "REJECTED" && (
              <button
                type="button"
                className="rounded p-1.5 hover:bg-muted"
                onClick={() => setStatus(data.id, "REJECTED")}
                aria-label="Reject review"
                title="Reject (hide)"
              >
                <X className="size-4" />
              </button>
            )}
            <button
              type="button"
              className="rounded p-1.5 text-destructive hover:bg-muted"
              onClick={() => remove(data.id)}
              aria-label="Delete review"
              title="Delete"
            >
              <Trash2 className="size-4" />
            </button>
          </span>
        )}
      />
      <MasterDetail
        enabled
        render={({ data }: { data: ReviewRow }) => (
          <div className="space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">Product: </span>
              {data.product?.name ?? "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Customer: </span>
              {data.authorName || data.user?.name || "—"}
              {data.user?.phone ? ` · ${data.user.phone}` : ""}
            </p>
            {data.title && <p className="font-medium">{data.title}</p>}
            {data.body && <p className="whitespace-pre-line text-muted-foreground">{data.body}</p>}
          </div>
        )}
      />
    </DataGrid>
  );
}
