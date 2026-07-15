import type { Metadata } from "next";
import { PurchasesGrid } from "@/components/admin/purchases-grid";

export const metadata: Metadata = { title: "Purchases" };

export default function AdminPurchasesPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-2xl font-bold">Purchases</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Wholesale stock bought from your supplier — counted as cost of goods in
          the P&amp;L. Expand a row to see its items.
        </p>
      </div>
      <PurchasesGrid />
    </div>
  );
}
