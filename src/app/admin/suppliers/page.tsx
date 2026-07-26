import type { Metadata } from "next";
import { SuppliersGrid } from "@/components/admin/suppliers-grid";

export const metadata: Metadata = { title: "Suppliers" };

export default function AdminSuppliersPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-2xl font-bold">Suppliers</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your wholesale vendors and how much you owe each of them. Record
          purchases against a supplier (in Purchases), then log payments here —
          the outstanding balance is purchases minus payments.
        </p>
      </div>
      <SuppliersGrid />
    </div>
  );
}
