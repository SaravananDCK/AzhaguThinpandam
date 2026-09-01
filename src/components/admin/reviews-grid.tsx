"use client";

import "@/components/admin/dx-setup";
import { useMemo, useRef, useState } from "react";
import DataGrid, {
  Column,
  Export,
  FilterRow,
  HeaderFilter,
  MasterDetail,
  Pager,
  Paging,
  SearchPanel,
} from "devextreme-react/data-grid";
import { exportGrid } from "@/components/admin/grid-export";
import type { DataGridRef } from "devextreme-react/data-grid";
import SelectBox from "devextreme-react/select-box";
import CustomStore from "devextreme/data/custom_store";
import { Check, Loader2, Plus, Star, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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

export type ProductOption = { id: string; name: string };

export function ReviewsGrid({ productOptions }: { productOptions: ProductOption[] }) {
  const gridRef = useRef<DataGridRef>(null);
  // "Add review" dialog — admin records feedback a customer sent on WhatsApp
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [productId, setProductId] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [date, setDate] = useState("");

  function openNew() {
    setProductId("");
    setAuthorName("");
    setRating(0);
    setTitle("");
    setBody("");
    setDate(new Date().toISOString().slice(0, 10));
    setOpen(true);
  }

  async function save() {
    if (!productId) {
      toast.error("Pick a product.");
      return;
    }
    if (!authorName.trim()) {
      toast.error("Enter the customer's name.");
      return;
    }
    if (rating < 1) {
      toast.error("Pick a star rating.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, authorName, rating, title, body, date }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not save the review.");
        return;
      }
      toast.success("Review added");
      setOpen(false);
      refresh();
    } finally {
      setSaving(false);
    }
  }

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
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openNew}>
          <Plus className="size-4" /> Add review
        </Button>
      </div>

    <DataGrid onExporting={exportGrid("reviews")} ref={gridRef} dataSource={store} showBorders columnAutoWidth rowAlternationEnabled>
      <FilterRow visible />
      <HeaderFilter visible />
      <SearchPanel visible width={240} placeholder="Search reviews…" />
      <Export enabled />
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-h-[90vh] overflow-y-auto sm:max-w-md"
          onInteractOutside={(e) => {
            // The product SelectBox's dropdown renders in a DevExtreme overlay
            // on document.body — outside this dialog's DOM. Without this, Radix
            // reads a click on the list as "outside" and closes the dialog.
            if ((e.target as HTMLElement | null)?.closest?.(".dx-overlay-wrapper")) {
              e.preventDefault();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>Add review</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            For feedback a customer sent over WhatsApp or in person. Goes live
            immediately (no moderation step) and counts toward the product&apos;s
            star rating.
          </p>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Product</Label>
              <SelectBox
                dataSource={productOptions}
                valueExpr="id"
                displayExpr="name"
                value={productId || null}
                searchEnabled
                searchExpr="name"
                searchMode="contains"
                minSearchLength={0}
                placeholder="Search product…"
                onValueChanged={(e) => setProductId(e.value ?? "")}
                aria-label="Product"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rv-name">Customer name</Label>
              <Input
                id="rv-name"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="As it should appear on the site"
                maxLength={80}
              />
            </div>
            <div className="grid gap-2">
              <Label>Rating</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    aria-label={`${n} star${n === 1 ? "" : "s"}`}
                    className="text-gold-500"
                  >
                    <Star
                      className={`size-6 ${n <= rating ? "fill-current" : "text-muted-foreground/30"}`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rv-title">Title (optional)</Label>
              <Input
                id="rv-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rv-body">Review (optional)</Label>
              <Textarea
                id="rv-body"
                rows={3}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={2000}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rv-date">Date</Label>
              <Input
                id="rv-date"
                type="date"
                value={date}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setDate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Backdate it to when the customer actually sent the feedback.
              </p>
            </div>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" />} Add review
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
