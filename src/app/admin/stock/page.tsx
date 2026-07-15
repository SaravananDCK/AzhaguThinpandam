import type { Metadata } from "next";
import { StockGrid } from "@/components/admin/stock-grid";

export const metadata: Metadata = { title: "Stock Movements" };

export default function AdminStockPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-2xl font-bold">Stock movements</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every change to inventory — sales, cancellations, manual edits and
          purchases received. Use the filter row to audit a single product.
        </p>
      </div>
      <StockGrid />
    </div>
  );
}
