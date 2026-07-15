"use client";

import "@/components/admin/dx-setup";
import { useCallback, useMemo, useRef, useState } from "react";
import DataGrid, {
  Column,
  MasterDetail,
  Paging,
  Pager,
  Summary,
  TotalItem,
} from "devextreme-react/data-grid";
import type { DataGridRef } from "devextreme-react/data-grid";
import CustomStore from "devextreme/data/custom_store";
import { Pencil, Plus, Trash2 } from "lucide-react";
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
import { formatINR } from "@/lib/money";

type ItemRow = { description: string; qty: string; unitCostRupees: string };
type PurchaseRow = {
  id: string;
  date: string;
  supplier: string;
  invoiceNo: string | null;
  notes: string | null;
  total: number;
  items: { id: string; description: string; qty: number; unitCost: number; amount: number }[];
};

const EMPTY_ITEM: ItemRow = { description: "", qty: "", unitCostRupees: "" };
const DEFAULT_SUPPLIER = "Karthick Sweets & Kadalai Mittai";

export function PurchasesGrid() {
  const gridRef = useRef<DataGridRef>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [date, setDate] = useState("");
  const [supplier, setSupplier] = useState(DEFAULT_SUPPLIER);
  const [invoiceNo, setInvoiceNo] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ItemRow[]>([{ ...EMPTY_ITEM }]);

  const store = useMemo(
    () =>
      new CustomStore({
        key: "id",
        load: async () => {
          const res = await fetch("/api/admin/purchases");
          if (!res.ok) throw new Error("Failed to load purchases");
          return res.json();
        },
        remove: async (key: string) => {
          const res = await fetch(`/api/admin/purchases/${key}`, { method: "DELETE" });
          if (!res.ok) throw new Error("Failed to delete");
        },
      }),
    []
  );

  const openNew = useCallback(() => {
    setEditingId(null);
    setDate(new Date().toISOString().slice(0, 10));
    setSupplier(DEFAULT_SUPPLIER);
    setInvoiceNo("");
    setNotes("");
    setItems([{ ...EMPTY_ITEM }]);
    setOpen(true);
  }, []);

  const openEdit = useCallback((row: PurchaseRow) => {
    setEditingId(row.id);
    setDate(row.date.slice(0, 10));
    setSupplier(row.supplier);
    setInvoiceNo(row.invoiceNo ?? "");
    setNotes(row.notes ?? "");
    setItems(
      row.items.map((i) => ({
        description: i.description,
        qty: String(i.qty),
        unitCostRupees: String(i.unitCost / 100),
      }))
    );
    setOpen(true);
  }, []);

  async function save() {
    const parsedItems = items
      .filter((i) => i.description.trim())
      .map((i) => ({
        description: i.description.trim(),
        qty: parseFloat(i.qty),
        unitCost: Math.round(parseFloat(i.unitCostRupees) * 100),
      }));
    if (!parsedItems.length) {
      toast.error("Add at least one item.");
      return;
    }
    if (parsedItems.some((i) => !Number.isFinite(i.qty) || i.qty <= 0 || !Number.isFinite(i.unitCost) || i.unitCost <= 0)) {
      toast.error("Every item needs a valid quantity and unit cost.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(
        editingId ? `/api/admin/purchases/${editingId}` : "/api/admin/purchases",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date, supplier, invoiceNo, notes, items: parsedItems }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not save the purchase.");
        return;
      }
      toast.success(editingId ? "Purchase updated" : "Purchase recorded");
      setOpen(false);
      gridRef.current?.instance().refresh();
    } finally {
      setSaving(false);
    }
  }

  const runningTotal = items.reduce((sum, i) => {
    const qty = parseFloat(i.qty);
    const cost = parseFloat(i.unitCostRupees);
    return Number.isFinite(qty) && Number.isFinite(cost) ? sum + qty * cost : sum;
  }, 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openNew}>
          <Plus className="size-4" /> Record purchase
        </Button>
      </div>

      <DataGrid ref={gridRef} dataSource={store} showBorders columnAutoWidth rowAlternationEnabled>
        <Paging defaultPageSize={12} />
        <Pager showInfo showNavigationButtons />
        <Column dataField="date" dataType="date" defaultSortOrder="desc" format="dd MMM yyyy" width={130} />
        <Column dataField="supplier" />
        <Column dataField="invoiceNo" caption="Invoice #" width={130} />
        <Column
          dataField="total"
          caption="Total"
          width={130}
          calculateCellValue={(row: PurchaseRow) => row.total / 100}
          dataType="number"
          format={{ type: "currency", currency: "INR", useCurrencyAccountingStyle: false }}
        />
        <Column
          caption=""
          width={110}
          cellRender={({ data }: { data: PurchaseRow }) => (
            <span className="flex gap-1">
              <button
                type="button"
                className="rounded p-1.5 hover:bg-muted"
                onClick={() => openEdit(data)}
                aria-label="Edit purchase"
              >
                <Pencil className="size-4" />
              </button>
              <button
                type="button"
                className="rounded p-1.5 text-destructive hover:bg-muted"
                onClick={async () => {
                  await store.remove(data.id);
                  gridRef.current?.instance().refresh();
                }}
                aria-label="Delete purchase"
              >
                <Trash2 className="size-4" />
              </button>
            </span>
          )}
        />
        <MasterDetail
          enabled
          render={({ data }: { data: PurchaseRow }) => (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="pb-1 pr-4">Item</th>
                  <th className="pb-1 pr-4">Qty (kg)</th>
                  <th className="pb-1 pr-4">Unit cost</th>
                  <th className="pb-1">Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((i) => (
                  <tr key={i.id}>
                    <td className="py-0.5 pr-4">{i.description}</td>
                    <td className="py-0.5 pr-4">{i.qty}</td>
                    <td className="py-0.5 pr-4">{formatINR(i.unitCost)}</td>
                    <td className="py-0.5">{formatINR(i.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        />
        <Summary>
          <TotalItem
            column="total"
            summaryType="sum"
            displayFormat="Total: ₹{0}"
            valueFormat={{ type: "fixedPoint", precision: 2 }}
          />
        </Summary>
      </DataGrid>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit purchase" : "Record purchase"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="pu-date">Date</Label>
              <Input id="pu-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="pu-supplier">Supplier</Label>
              <Input id="pu-supplier" value={supplier} onChange={(e) => setSupplier(e.target.value)} />
            </div>
            <div className="grid gap-2 sm:col-span-3">
              <Label htmlFor="pu-invoice">Supplier invoice # (optional)</Label>
              <Input id="pu-invoice" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Items</Label>
            {items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_90px_110px_32px] items-center gap-2">
                <Input
                  placeholder="e.g. Kadalai Mittai"
                  value={item.description}
                  onChange={(e) =>
                    setItems((rows) => rows.map((r, i) => (i === idx ? { ...r, description: e.target.value } : r)))
                  }
                />
                <Input
                  placeholder="kg"
                  inputMode="decimal"
                  value={item.qty}
                  onChange={(e) =>
                    setItems((rows) => rows.map((r, i) => (i === idx ? { ...r, qty: e.target.value } : r)))
                  }
                />
                <Input
                  placeholder="₹/kg"
                  inputMode="decimal"
                  value={item.unitCostRupees}
                  onChange={(e) =>
                    setItems((rows) =>
                      rows.map((r, i) => (i === idx ? { ...r, unitCostRupees: e.target.value } : r))
                    )
                  }
                />
                <button
                  type="button"
                  className="rounded p-1.5 text-muted-foreground hover:text-destructive"
                  onClick={() => setItems((rows) => rows.filter((_, i) => i !== idx))}
                  disabled={items.length === 1}
                  aria-label="Remove item"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
            <div className="flex items-center justify-between">
              <Button type="button" variant="outline" size="sm" onClick={() => setItems((r) => [...r, { ...EMPTY_ITEM }])}>
                <Plus className="size-3.5" /> Add item
              </Button>
              <p className="text-sm font-semibold">Total: ₹{runningTotal.toLocaleString("en-IN")}</p>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="pu-notes">Notes (optional)</Label>
            <Textarea id="pu-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : editingId ? "Update purchase" : "Save purchase"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
