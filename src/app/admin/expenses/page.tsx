import type { Metadata } from "next";
import { ExpensesGrid } from "@/components/admin/expenses-grid";

export const metadata: Metadata = { title: "Expenses" };

export default function AdminExpensesPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-2xl font-bold">Expenses</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Packing materials, transport, marketing and other running costs — these
          feed the monthly P&amp;L.
        </p>
      </div>
      <ExpensesGrid />
    </div>
  );
}
