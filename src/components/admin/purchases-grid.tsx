"use client";

import "@/components/admin/dx-setup";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DataGrid, {
  Column,
  MasterDetail,
  Paging,
  Pager,
  Summary,
  TotalItem,
} from "devextreme-react/data-grid";
import type { DataGridRef } from "devextreme-react/data-grid";
import SelectBox from "devextreme-react/select-box";
import CustomStore from "devextreme/data/custom_store";
import { HandCoins, Pencil, Plus, Trash2, Undo2 } from "lucide-react";
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
import { formatINR, rupeesToPaise } from "@/lib/money";
import {
  PURCHASE_STATUS_LABELS,
  SUPPLIER_PAYMENT_METHODS,
  type PurchaseStatus,
} from "@/lib/constants";

type ItemRow = {
  description: string;
  qty: string;
  unitCostRupees: string;
  variantId: string;
  packs: string;
};
type PurchaseRow = {
  id: string;
  date: string;
  supplier: string;
  supplierId: string | null;
  gstRate: number;
  invoiceNo: string | null;
  notes: string | null;
  total: number;
  status: string;
  items: {
    id: string;
    description: string;
    qty: number;
    unitCost: number;
    amount: number;
    variantId: string | null;
    packs: number | null;
    variant?: { label: string; product: { name: string } } | null;
  }[];
};

export type VariantOption = {
  id: string;
  name: string;
  grams: number | null; // pack weight → default kg
  pricePerKgPaise: number | null; // wholesale ₹/kg → default unit cost
};
export type SupplierOption = { id: string; name: string; gstRate: number | null };

/** A pre-filled draft (consolidated from selected orders) that opens the
    Record-purchase dialog on mount. Nothing is saved until the admin does. */
export type PurchaseDraft = { note: string; items: ItemRow[] };

const EMPTY_ITEM: ItemRow = { description: "", qty: "", unitCostRupees: "", variantId: "", packs: "" };

const STATUS_STYLE: Record<string, string> = {
  UNPAID: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  PAID: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
};

/** GST component of a GST-inclusive rupee amount at the given rate (%). */
function gstOf(inclusiveRupees: number, rate: number): number {
  if (!rate || rate <= 0) return 0;
  return (inclusiveRupees * rate) / (100 + rate);
}

export function PurchasesGrid({
  variantOptions,
  supplierOptions,
  draft,
}: {
  variantOptions: VariantOption[];
  supplierOptions: SupplierOption[];
  draft?: PurchaseDraft;
}) {
  const gridRef = useRef<DataGridRef>(null);
  // Index of a newly-added item row whose Item field should grab focus on mount
  const pendingFocus = useRef(-1);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [date, setDate] = useState("");
  const [supplierId, setSupplierId] = useState("");
  // Free-text name kept for legacy purchases recorded before suppliers existed
  const [legacySupplier, setLegacySupplier] = useState("");
  const [gstRate, setGstRate] = useState("0");
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
    const first = supplierOptions[0];
    setSupplierId(first?.id ?? "");
    setLegacySupplier("");
    setGstRate(first?.gstRate != null ? String(first.gstRate) : "0");
    setInvoiceNo("");
    setNotes("");
    setItems([{ ...EMPTY_ITEM }]);
    setOpen(true);
  }, [supplierOptions]);

  // A consolidated draft from selected orders opens the dialog pre-filled, once.
  const seeded = useRef(false); // also guards StrictMode's double effect run
  useEffect(() => {
    if (!draft || seeded.current) return;
    seeded.current = true;
    setEditingId(null);
    setDate(new Date().toISOString().slice(0, 10));
    const first = supplierOptions[0];
    setSupplierId(first?.id ?? "");
    setLegacySupplier("");
    setGstRate(first?.gstRate != null ? String(first.gstRate) : "0");
    setInvoiceNo("");
    setNotes(draft.note);
    setItems(draft.items.length ? draft.items.map((i) => ({ ...i })) : [{ ...EMPTY_ITEM }]);
    setOpen(true);
    // Strip ?fromOrders without an RSC round-trip (Next shallow routing), so a
    // refresh or back-press doesn't re-open a stale draft.
    window.history.replaceState(null, "", "/admin/purchases");
  }, [draft, supplierOptions]);

  // "Mark as paid" dialog — flips the invoice and optionally logs the matching
  // supplier payment so the payables ledger keeps agreeing with the statuses.
  const [payRow, setPayRow] = useState<PurchaseRow | null>(null);
  const [payLogging, setPayLogging] = useState(true);
  const [payDate, setPayDate] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<string>("UPI");
  const [payReference, setPayReference] = useState("");
  const [payBusy, setPayBusy] = useState(false);

  function openPay(row: PurchaseRow) {
    setPayRow(row);
    setPayLogging(Boolean(row.supplierId));
    setPayDate(new Date().toISOString().slice(0, 10));
    setPayAmount(String(row.total / 100));
    setPayMethod("UPI");
    setPayReference("");
  }

  async function setStatus(row: PurchaseRow, status: PurchaseStatus, withPayment: boolean) {
    setPayBusy(true);
    try {
      const amount = rupeesToPaise(payAmount);
      if (withPayment && (amount === null || amount < 1)) {
        toast.error("Enter a valid payment amount.");
        return;
      }
      const res = await fetch(`/api/admin/purchases/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          ...(withPayment
            ? { payment: { date: payDate, amount, method: payMethod, reference: payReference } }
            : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not update the purchase.");
        return;
      }
      toast.success(
        status === "PAID"
          ? withPayment
            ? "Marked paid — payment recorded against the supplier"
            : "Marked paid"
          : "Marked unpaid"
      );
      setPayRow(null);
      gridRef.current?.instance().refresh();
    } finally {
      setPayBusy(false);
    }
  }

  const openEdit = useCallback((row: PurchaseRow) => {
    setEditingId(row.id);
    setDate(row.date.slice(0, 10));
    setSupplierId(row.supplierId ?? "");
    // If the purchase predates suppliers (no link), keep its free-text name
    setLegacySupplier(row.supplierId ? "" : row.supplier);
    setGstRate(String(row.gstRate ?? 0));
    setInvoiceNo(row.invoiceNo ?? "");
    setNotes(row.notes ?? "");
    setItems(
      row.items.map((i) => ({
        description: i.description,
        qty: String(i.qty),
        unitCostRupees: String(i.unitCost / 100),
        variantId: i.variantId ?? "",
        packs: i.packs ? String(i.packs) : "",
      }))
    );
    setOpen(true);
  }, []);

  function onSupplierChange(id: string) {
    setSupplierId(id);
    setLegacySupplier("");
    const s = supplierOptions.find((o) => o.id === id);
    if (s?.gstRate != null) setGstRate(String(s.gstRate));
  }

  // packets × pack-weight → kg (as a string), or null if not computable
  function kgFromPackets(packetsStr: string, grams: number | null | undefined): string | null {
    const n = parseInt(packetsStr, 10);
    if (grams && Number.isFinite(n) && n > 0) return String((n * grams) / 1000);
    return null;
  }

  // Picking an item sets its variant link + description snapshot, and prefills
  // ₹/kg (wholesale cost) and kg (from the packets already entered, else one
  // pack). Everything stays editable; deselecting keeps the existing values.
  function onItemVariantChange(idx: number, variantId: string) {
    const opt = variantOptions.find((v) => v.id === variantId);
    setItems((rows) =>
      rows.map((r, i) => {
        if (i !== idx) return r;
        if (!variantId) return { ...r, variantId };
        const kg = kgFromPackets(r.packs, opt?.grams) ?? (opt?.grams ? String(opt.grams / 1000) : r.qty);
        return {
          ...r,
          variantId,
          description: opt?.name ?? r.description,
          qty: kg,
          unitCostRupees:
            opt?.pricePerKgPaise != null ? String(opt.pricePerKgPaise / 100) : r.unitCostRupees,
        };
      })
    );
  }

  // Entering the number of packets auto-fills the kg (packets × pack-weight).
  function onPacketsChange(idx: number, packetsStr: string) {
    setItems((rows) =>
      rows.map((r, i) => {
        if (i !== idx) return r;
        const opt = variantOptions.find((v) => v.id === r.variantId);
        const kg = kgFromPackets(packetsStr, opt?.grams);
        return { ...r, packs: packetsStr, ...(kg != null ? { qty: kg } : {}) };
      })
    );
  }

  async function save() {
    // A line that has a qty/cost but no item picked is an oversight, not a
    // blank row — flag it rather than silently dropping it.
    if (items.some((i) => (i.qty.trim() || i.unitCostRupees.trim()) && !i.description.trim())) {
      toast.error("Pick an item for each line.");
      return;
    }
    const parsedItems = items
      .filter((i) => i.description.trim())
      .map((i) => ({
        description: i.description.trim(),
        qty: parseFloat(i.qty),
        unitCost: Math.round(parseFloat(i.unitCostRupees) * 100),
        variantId: i.variantId || "",
        ...(i.variantId && i.packs ? { packs: parseInt(i.packs, 10) } : {}),
      }));
    if (!parsedItems.length) {
      toast.error("Add at least one item.");
      return;
    }
    if (parsedItems.some((i) => !Number.isFinite(i.qty) || i.qty <= 0 || !Number.isFinite(i.unitCost) || i.unitCost <= 0)) {
      toast.error("Every item needs a valid quantity and unit cost.");
      return;
    }
    const supplierName =
      supplierOptions.find((o) => o.id === supplierId)?.name || legacySupplier.trim();
    if (!supplierName) {
      toast.error("Pick a supplier (add one in Suppliers first).");
      return;
    }
    const rate = parseFloat(gstRate) || 0;
    setSaving(true);
    try {
      const res = await fetch(
        editingId ? `/api/admin/purchases/${editingId}` : "/api/admin/purchases",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date,
            supplier: supplierName,
            supplierId,
            gstRate: rate,
            invoiceNo,
            notes,
            items: parsedItems,
          }),
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
        <Column dataField="invoiceNo" caption="Invoice #" width={120} />
        <Column
          dataField="gstRate"
          caption="GST %"
          width={80}
          calculateCellValue={(row: PurchaseRow) => (row.gstRate ? `${row.gstRate}%` : "—")}
        />
        <Column
          dataField="total"
          caption="Total"
          width={130}
          calculateCellValue={(row: PurchaseRow) => row.total / 100}
          dataType="number"
          format={{ type: "currency", currency: "INR", useCurrencyAccountingStyle: false }}
        />
        <Column
          dataField="status"
          caption="Payment"
          width={100}
          cellRender={({ data }: { data: PurchaseRow }) => (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[data.status] ?? ""}`}
            >
              {PURCHASE_STATUS_LABELS[data.status as PurchaseStatus] ?? data.status}
            </span>
          )}
        />
        <Column
          caption=""
          width={140}
          cellRender={({ data }: { data: PurchaseRow }) => (
            <span className="flex gap-1">
              {data.status === "PAID" ? (
                <button
                  type="button"
                  className="rounded p-1.5 hover:bg-muted"
                  onClick={() => setStatus(data, "UNPAID", false)}
                  aria-label="Mark unpaid"
                  title="Mark unpaid"
                >
                  <Undo2 className="size-4" />
                </button>
              ) : (
                <button
                  type="button"
                  className="rounded p-1.5 text-green-700 hover:bg-muted dark:text-green-400"
                  onClick={() => openPay(data)}
                  aria-label="Mark as paid"
                  title="Mark as paid"
                >
                  <HandCoins className="size-4" />
                </button>
              )}
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
                    <td className="py-0.5 pr-4">
                      {i.description}
                      {i.variant && i.packs ? (
                        <span className="ml-2 text-xs text-green-700 dark:text-green-400">
                          → +{i.packs} × {i.variant.product.name} ({i.variant.label})
                        </span>
                      ) : null}
                    </td>
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
        <DialogContent
          className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"
          onInteractOutside={(e) => {
            // The item SelectBox's dropdown renders in a DevExtreme overlay on
            // document.body — outside this dialog's DOM. Without this, Radix
            // reads a click on the list as "outside" and closes the dialog.
            if ((e.target as HTMLElement | null)?.closest?.(".dx-overlay-wrapper")) {
              e.preventDefault();
            }
          }}
        >
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
              {supplierOptions.length === 0 && !legacySupplier ? (
                <Input value="No suppliers yet — add one in Suppliers" disabled />
              ) : (
                <select
                  id="pu-supplier"
                  className="h-9 rounded-md border bg-background px-2 text-sm"
                  value={supplierId}
                  onChange={(e) => onSupplierChange(e.target.value)}
                >
                  {legacySupplier && (
                    <option value="">{legacySupplier} (not linked)</option>
                  )}
                  {supplierOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pu-gst">GST rate %</Label>
              <Input
                id="pu-gst"
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={gstRate}
                onChange={(e) => setGstRate(e.target.value)}
              />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="pu-invoice">Supplier invoice # (optional)</Label>
              <Input id="pu-invoice" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Items</Label>
            <p className="text-xs text-muted-foreground">
              Columns: <strong>item · packets · kg · ₹/kg</strong>. Choosing an item fills
              ₹/kg (wholesale cost); typing the number of packets fills the kg
              (12 × 250 g = 3 kg) and adds those packets to stock. You can still edit the
              kg directly for loose/bulk buys.
            </p>
            {/* Column headers */}
            <div className="grid grid-cols-[1fr_60px_64px_72px_76px_28px] items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <span>Item</span>
              <span>Packets</span>
              <span>kg</span>
              <span>₹/kg</span>
              <span className="text-right">Amount</span>
              <span />
            </div>
            {items.map((item, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-[1fr_60px_64px_72px_76px_28px] items-center gap-1.5"
                >
                  <SelectBox
                    dataSource={
                      // Keep a since-deleted/legacy linked item selectable when editing
                      item.variantId && !variantOptions.some((v) => v.id === item.variantId)
                        ? [{ id: item.variantId, name: item.description || "Linked item" }, ...variantOptions]
                        : variantOptions
                    }
                    valueExpr="id"
                    displayExpr="name"
                    value={item.variantId || null}
                    searchEnabled
                    searchExpr="name"
                    searchMode="contains"
                    minSearchLength={0}
                    placeholder="Search item…"
                    showClearButton
                    onValueChanged={(e) => {
                      // Only react to user selection, not the programmatic initial value
                      if (e.event) onItemVariantChange(idx, e.value ?? "");
                    }}
                    onInitialized={(e) => {
                      if (idx === pendingFocus.current) {
                        pendingFocus.current = -1;
                        setTimeout(() => {
                          e.component?.focus();
                          e.component?.open();
                        }, 0);
                      }
                    }}
                    aria-label="Item"
                  />
                  <Input
                    placeholder="packets"
                    inputMode="numeric"
                    aria-label="Number of packets"
                    disabled={!item.variantId}
                    value={item.packs}
                    onChange={(e) => onPacketsChange(idx, e.target.value)}
                  />
                  <Input
                    placeholder="kg"
                    inputMode="decimal"
                    aria-label="Total kg"
                    value={item.qty}
                    onChange={(e) =>
                      setItems((rows) => rows.map((r, i) => (i === idx ? { ...r, qty: e.target.value } : r)))
                    }
                  />
                  <Input
                    placeholder="₹/kg"
                    inputMode="decimal"
                    aria-label="Cost per kg"
                    value={item.unitCostRupees}
                    onChange={(e) =>
                      setItems((rows) =>
                        rows.map((r, i) => (i === idx ? { ...r, unitCostRupees: e.target.value } : r))
                      )
                    }
                  />
                  {/* Read-only line amount = kg × ₹/kg */}
                  <span className="text-right text-sm tabular-nums text-muted-foreground">
                    {(() => {
                      const amount = parseFloat(item.qty) * parseFloat(item.unitCostRupees);
                      return Number.isFinite(amount)
                        ? `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
                        : "—";
                    })()}
                  </span>
                  <button
                    type="button"
                    className="rounded p-1 text-muted-foreground hover:text-destructive"
                    onClick={() => setItems((rows) => rows.filter((_, i) => i !== idx))}
                    disabled={items.length === 1}
                    aria-label="Remove item"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
            ))}
            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  pendingFocus.current = items.length; // the row about to be appended
                  setItems((r) => [...r, { ...EMPTY_ITEM }]);
                }}
              >
                <Plus className="size-3.5" /> Add item
              </Button>
              <p className="text-right text-sm">
                <span className="font-semibold">
                  Total: ₹{runningTotal.toLocaleString("en-IN")}
                </span>
                {parseFloat(gstRate) > 0 && (
                  <span className="block text-xs text-muted-foreground">
                    incl. GST ₹
                    {gstOf(runningTotal, parseFloat(gstRate)).toLocaleString("en-IN", {
                      maximumFractionDigits: 2,
                    })}{" "}
                    ({gstRate}%)
                  </span>
                )}
              </p>
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

      {/* Mark as paid */}
      <Dialog open={payRow !== null} onOpenChange={(o) => !o && setPayRow(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Mark as paid</DialogTitle>
          </DialogHeader>
          {payRow && (
            <div className="grid gap-4">
              <p className="text-sm text-muted-foreground">
                {payRow.supplier} · <span className="font-semibold">{formatINR(payRow.total)}</span>
                {payRow.invoiceNo ? ` · invoice ${payRow.invoiceNo}` : ""}
              </p>

              {payRow.supplierId ? (
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={payLogging}
                    onChange={(e) => setPayLogging(e.target.checked)}
                    className="mt-0.5 size-4 accent-primary"
                  />
                  <span>
                    Also record a payment to {payRow.supplier}
                    <span className="block text-xs text-muted-foreground">
                      Keeps &ldquo;Owed to suppliers&rdquo; right. Untick if you already
                      logged this in Suppliers (e.g. as part of a lump sum).
                    </span>
                  </span>
                </label>
              ) : (
                <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                  This purchase isn&apos;t linked to a supplier, so only the status
                  changes — nothing is added to the payables ledger.
                </p>
              )}

              {payRow.supplierId && payLogging && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label htmlFor="pay-amount">Amount ₹</Label>
                      <Input
                        id="pay-amount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="pay-date">Date</Label>
                      <Input
                        id="pay-date"
                        type="date"
                        value={payDate}
                        onChange={(e) => setPayDate(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label htmlFor="pay-method">Method</Label>
                      <select
                        id="pay-method"
                        className="h-9 rounded-md border bg-background px-2 text-sm"
                        value={payMethod}
                        onChange={(e) => setPayMethod(e.target.value)}
                      >
                        {SUPPLIER_PAYMENT_METHODS.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="pay-ref">Reference</Label>
                      <Input
                        id="pay-ref"
                        placeholder="Txn / cheque no."
                        value={payReference}
                        onChange={(e) => setPayReference(e.target.value)}
                      />
                    </div>
                  </div>
                </>
              )}

              <Button
                onClick={() =>
                  setStatus(payRow, "PAID", Boolean(payRow.supplierId) && payLogging)
                }
                disabled={payBusy}
              >
                {payBusy ? "Saving…" : "Mark as paid"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
