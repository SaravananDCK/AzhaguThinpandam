"use client";

import "@/components/admin/dx-setup";
import { useCallback, useMemo, useRef, useState } from "react";
import DataGrid, {
  Column,
  Export,
  FilterRow,
  HeaderFilter,
  MasterDetail,
  Pager,
  Paging,
  SearchPanel,
  Summary,
  TotalItem,
} from "devextreme-react/data-grid";
import { exportGrid } from "@/components/admin/grid-export";
import type { DataGridRef } from "devextreme-react/data-grid";
import CustomStore from "devextreme/data/custom_store";
import { HandCoins, Pencil, Plus, Trash2 } from "lucide-react";
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
import { SUPPLIER_PAYMENT_METHODS } from "@/lib/constants";

type PaymentRow = {
  id: string;
  date: string;
  amount: number;
  method: string | null;
  reference: string | null;
  notes: string | null;
};
type SupplierRow = {
  id: string;
  name: string;
  gstin: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  gstRate: number | null;
  notes: string | null;
  isActive: boolean;
  payments: PaymentRow[];
  purchased: number;
  paid: number;
  owed: number;
};

const EMPTY_FORM = {
  name: "",
  phone: "",
  email: "",
  gstin: "",
  gstRate: "",
  address: "",
  notes: "",
  isActive: true,
};

export function SuppliersGrid() {
  const gridRef = useRef<DataGridRef>(null);

  // Supplier add/edit dialog
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  // Payment dialog
  const [payOpen, setPayOpen] = useState(false);
  const [paySaving, setPaySaving] = useState(false);
  const [payFor, setPayFor] = useState<SupplierRow | null>(null);
  const [payDate, setPayDate] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<string>("Cash");
  const [payRef, setPayRef] = useState("");
  const [payNotes, setPayNotes] = useState("");

  const store = useMemo(
    () =>
      new CustomStore({
        key: "id",
        load: async () => {
          const res = await fetch("/api/admin/suppliers");
          if (!res.ok) throw new Error("Failed to load suppliers");
          return res.json();
        },
        remove: async (key: string) => {
          const res = await fetch(`/api/admin/suppliers/${key}`, { method: "DELETE" });
          if (!res.ok) throw new Error("Failed to delete");
        },
      }),
    []
  );

  const refresh = useCallback(() => gridRef.current?.instance().refresh(), []);

  const openNew = useCallback(() => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setOpen(true);
  }, []);

  const openEdit = useCallback((row: SupplierRow) => {
    setEditingId(row.id);
    setForm({
      name: row.name,
      phone: row.phone ?? "",
      email: row.email ?? "",
      gstin: row.gstin ?? "",
      gstRate: row.gstRate != null ? String(row.gstRate) : "",
      address: row.address ?? "",
      notes: row.notes ?? "",
      isActive: row.isActive,
    });
    setOpen(true);
  }, []);

  async function save() {
    if (form.name.trim().length < 2) {
      toast.error("Enter a supplier name.");
      return;
    }
    const gstRate = form.gstRate.trim() ? parseFloat(form.gstRate) : null;
    if (gstRate != null && (!Number.isFinite(gstRate) || gstRate < 0 || gstRate > 100)) {
      toast.error("GST rate must be between 0 and 100.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(
        editingId ? `/api/admin/suppliers/${editingId}` : "/api/admin/suppliers",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name.trim(),
            phone: form.phone.trim(),
            email: form.email.trim(),
            gstin: form.gstin.trim(),
            gstRate,
            address: form.address.trim(),
            notes: form.notes.trim(),
            isActive: form.isActive,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not save the supplier.");
        return;
      }
      toast.success(editingId ? "Supplier updated" : "Supplier added");
      setOpen(false);
      refresh();
    } finally {
      setSaving(false);
    }
  }

  const openPayment = useCallback((row: SupplierRow) => {
    setPayFor(row);
    setPayDate(new Date().toISOString().slice(0, 10));
    setPayAmount(row.owed > 0 ? String(row.owed / 100) : "");
    setPayMethod("Cash");
    setPayRef("");
    setPayNotes("");
    setPayOpen(true);
  }, []);

  async function savePayment() {
    if (!payFor) return;
    const amount = rupeesToPaise(payAmount);
    if (!amount || amount <= 0) {
      toast.error("Enter a valid payment amount.");
      return;
    }
    setPaySaving(true);
    try {
      const res = await fetch(`/api/admin/suppliers/${payFor.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: payDate,
          amount,
          method: payMethod,
          reference: payRef.trim(),
          notes: payNotes.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not record the payment.");
        return;
      }
      toast.success("Payment recorded");
      setPayOpen(false);
      refresh();
    } finally {
      setPaySaving(false);
    }
  }

  async function deletePayment(paymentId: string) {
    const res = await fetch(`/api/admin/supplier-payments/${paymentId}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Could not delete the payment.");
      return;
    }
    toast.success("Payment removed");
    refresh();
  }

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openNew}>
          <Plus className="size-4" /> Add supplier
        </Button>
      </div>

      <DataGrid onExporting={exportGrid("suppliers")} ref={gridRef} dataSource={store} showBorders columnAutoWidth rowAlternationEnabled>
        <FilterRow visible />
        <HeaderFilter visible />
        <SearchPanel visible width={240} placeholder="Search suppliers…" />
        <Export enabled />
        <Paging defaultPageSize={12} />
        <Pager showInfo showNavigationButtons />
        <Column dataField="name" caption="Supplier" />
        <Column dataField="phone" width={130} />
        <Column dataField="gstin" caption="GSTIN" width={150} />
        <Column
          dataField="gstRate"
          caption="GST %"
          width={80}
          calculateCellValue={(r: SupplierRow) => (r.gstRate != null ? `${r.gstRate}%` : "—")}
        />
        <Column
          dataField="purchased"
          caption="Purchased"
          width={120}
          calculateCellValue={(r: SupplierRow) => r.purchased / 100}
          dataType="number"
          format={{ type: "currency", currency: "INR" }}
        />
        <Column
          dataField="paid"
          caption="Paid"
          width={120}
          calculateCellValue={(r: SupplierRow) => r.paid / 100}
          dataType="number"
          format={{ type: "currency", currency: "INR" }}
        />
        <Column
          dataField="owed"
          caption="Owed"
          width={130}
          calculateCellValue={(r: SupplierRow) => r.owed / 100}
          dataType="number"
          format={{ type: "currency", currency: "INR" }}
          cellRender={({ data }: { data: SupplierRow }) => (
            <span className={data.owed > 0 ? "font-semibold text-destructive" : "text-muted-foreground"}>
              {formatINR(data.owed)}
            </span>
          )}
        />
        <Column
          caption=""
          width={130}
          cellRender={({ data }: { data: SupplierRow }) => (
            <span className="flex gap-1">
              <button
                type="button"
                className="rounded p-1.5 hover:bg-muted"
                onClick={() => openPayment(data)}
                aria-label="Record payment"
                title="Record payment"
              >
                <HandCoins className="size-4" />
              </button>
              <button
                type="button"
                className="rounded p-1.5 hover:bg-muted"
                onClick={() => openEdit(data)}
                aria-label="Edit supplier"
                title="Edit supplier"
              >
                <Pencil className="size-4" />
              </button>
              <button
                type="button"
                className="rounded p-1.5 text-destructive hover:bg-muted"
                onClick={async () => {
                  await store.remove(data.id);
                  refresh();
                }}
                aria-label="Delete supplier"
                title="Delete supplier"
              >
                <Trash2 className="size-4" />
              </button>
            </span>
          )}
        />
        <MasterDetail
          enabled
          render={({ data }: { data: SupplierRow }) => (
            <div className="space-y-2">
              <p className="text-sm font-semibold">
                Payments — {formatINR(data.paid)} of {formatINR(data.purchased)} purchased
                {data.owed > 0 ? (
                  <span className="text-destructive"> · {formatINR(data.owed)} still owed</span>
                ) : (
                  <span className="text-green-700 dark:text-green-400"> · settled up</span>
                )}
              </p>
              {data.payments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th className="pb-1 pr-4">Date</th>
                      <th className="pb-1 pr-4">Amount</th>
                      <th className="pb-1 pr-4">Method</th>
                      <th className="pb-1 pr-4">Reference</th>
                      <th className="pb-1" />
                    </tr>
                  </thead>
                  <tbody>
                    {data.payments.map((p) => (
                      <tr key={p.id}>
                        <td className="py-0.5 pr-4">
                          {new Date(p.date).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="py-0.5 pr-4">{formatINR(p.amount)}</td>
                        <td className="py-0.5 pr-4">{p.method ?? "—"}</td>
                        <td className="py-0.5 pr-4">{p.reference ?? "—"}</td>
                        <td className="py-0.5">
                          <button
                            type="button"
                            className="rounded p-1 text-muted-foreground hover:text-destructive"
                            onClick={() => deletePayment(p.id)}
                            aria-label="Delete payment"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        />
        <Summary>
          <TotalItem
            column="owed"
            summaryType="sum"
            displayFormat="Owed: ₹{0}"
            valueFormat={{ type: "fixedPoint", precision: 2 }}
          />
        </Summary>
      </DataGrid>

      {/* Supplier add/edit */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit supplier" : "Add supplier"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="su-name">Name</Label>
              <Input id="su-name" value={form.name} onChange={(e) => set({ name: e.target.value })} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="su-phone">Phone</Label>
                <Input id="su-phone" value={form.phone} onChange={(e) => set({ phone: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="su-email">Email</Label>
                <Input id="su-email" type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="su-gstin">GSTIN</Label>
                <Input id="su-gstin" value={form.gstin} onChange={(e) => set({ gstin: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="su-gstrate">Default GST %</Label>
                <Input
                  id="su-gstrate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  placeholder="e.g. 5"
                  value={form.gstRate}
                  onChange={(e) => set({ gstRate: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="su-address">Address</Label>
              <Textarea id="su-address" rows={2} value={form.address} onChange={(e) => set({ address: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="su-notes">Notes</Label>
              <Textarea id="su-notes" rows={2} value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => set({ isActive: e.target.checked })}
                className="size-4 accent-primary"
              />
              Active (shown in the purchase form)
            </label>
          </div>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : editingId ? "Update supplier" : "Add supplier"}
          </Button>
        </DialogContent>
      </Dialog>

      {/* Record payment */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record payment{payFor ? ` — ${payFor.name}` : ""}</DialogTitle>
          </DialogHeader>
          {payFor && payFor.owed > 0 && (
            <p className="text-sm text-muted-foreground">
              Currently owed: <span className="font-semibold text-destructive">{formatINR(payFor.owed)}</span>
            </p>
          )}
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="pay-date">Date</Label>
                <Input id="pay-date" type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
              </div>
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
            </div>
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
              <Label htmlFor="pay-ref">Reference (optional)</Label>
              <Input id="pay-ref" value={payRef} onChange={(e) => setPayRef(e.target.value)} placeholder="UPI ref / cheque no" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pay-notes">Notes (optional)</Label>
              <Textarea id="pay-notes" rows={2} value={payNotes} onChange={(e) => setPayNotes(e.target.value)} />
            </div>
          </div>
          <Button onClick={savePayment} disabled={paySaving}>
            {paySaving ? "Saving…" : "Record payment"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
