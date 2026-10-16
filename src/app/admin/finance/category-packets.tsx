"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { formatINR } from "@/lib/money";
import type { CategorySales } from "@/lib/finance-analytics";

const pct = (v: number | null) => (v == null ? "—" : `${v.toFixed(1)}%`);

function signed(amount: number): string {
  return `${amount < 0 ? "−" : ""}${formatINR(Math.abs(amount))}`;
}

function kg(grams: number): string {
  if (!grams) return "—";
  return `${(grams / 1000).toLocaleString("en-IN", { maximumFractionDigits: 2 })} kg`;
}

const th = "px-2 py-1.5 text-right font-medium first:text-left";
const td = "px-2 py-1.5 text-right first:text-left";

/**
 * Packets sold per category, with a what-if: raise every packet by ₹N and see
 * what the period's profit and margin would have been at the same volumes.
 * It assumes nobody buys less because of the increase — a ceiling, not a
 * forecast.
 */
export function CategoryPackets({
  categories,
  expensesTotal,
  totalMargin,
}: {
  categories: CategorySales[];
  /** The period's overheads (Expenses table + supplier-billed transport), paise */
  expensesTotal: number;
  /** Sum of the orders' margins (goods + shipping collected − cost − packing − courier) */
  totalMargin: number;
}) {
  const [increase, setIncrease] = useState("5");
  const perPack = Math.round((Number(increase) || 0) * 100); // paise
  const totalPacks = categories.reduce((s, c) => s + c.packs, 0);
  const goodsProfit = categories.reduce((s, c) => s + c.profit, 0);
  // Category profit is goods only. What the orders cost beyond the goods —
  // courier, packing and free goodies, less shipping collected — is the gap
  // between that and the orders' margins. It's spread over the packets along
  // with the overheads, so the total after expenses here equals the per-order
  // "margin after expenses" × orders.
  const orderCosts = goodsProfit - totalMargin;
  const expensePerPack = totalPacks ? (expensesTotal + orderCosts) / totalPacks : 0;

  const rows = categories.map((c) => {
    const expenses = Math.round(c.packs * expensePerPack);
    const extra = c.packs * perPack;
    const whatIfProfit = c.profit + extra;
    const whatIfRevenue = c.revenue + extra;
    return {
      ...c,
      expenses,
      net: c.profit - expenses,
      whatIfProfit,
      whatIfMarginPct: whatIfRevenue > 0 ? (whatIfProfit / whatIfRevenue) * 100 : null,
      whatIfNet: whatIfProfit - expenses,
    };
  });
  const sum = (f: (r: (typeof rows)[number]) => number) => rows.reduce((s, r) => s + f(r), 0);
  const totalRevenue = sum((r) => r.revenue);
  const totalProfit = sum((r) => r.profit);
  const totalExpenses = sum((r) => r.expenses);
  const totalWhatIfProfit = sum((r) => r.whatIfProfit);
  const totalWhatIfRevenue = totalRevenue + totalPacks * perPack;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-semibold">Packets sold by category</p>
          <p className="text-xs text-muted-foreground">
            Across the orders counted as sales. Free goodies not included.
          </p>
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          If every packet cost ₹
          <Input
            type="number"
            inputMode="decimal"
            step="1"
            value={increase}
            onChange={(e) => setIncrease(e.target.value)}
            className="h-8 w-20 text-right text-sm"
            aria-label="Price increase per packet, rupees"
          />
          more
        </label>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground">
              <th colSpan={5} />
              <th colSpan={3} className="border-b px-2 py-1 text-center font-medium">
                Today&apos;s prices
              </th>
              <th colSpan={3} className="border-b px-2 py-1 text-center font-medium text-primary">
                At +{formatINR(perPack)} a packet
              </th>
            </tr>
            <tr className="border-b text-xs text-muted-foreground">
              <th className={th}>Category</th>
              <th className={th}>Packets</th>
              <th className={th}>Weight</th>
              <th className={th}>Avg / packet</th>
              <th className={th}>Expenses</th>
              <th className={th}>Profit</th>
              <th className={th}>Margin</th>
              <th className={th}>After expenses</th>
              <th className={`${th} text-primary`}>Profit</th>
              <th className={`${th} text-primary`}>Margin</th>
              <th className={`${th} text-primary`}>After expenses</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.category} className="border-b last:border-b-0">
                <td className={td}>{c.category}</td>
                <td className={`${td} font-medium`}>{c.packs}</td>
                <td className={td}>{kg(c.grams)}</td>
                <td className={td}>{formatINR(c.avgPackPrice)}</td>
                <td className={td}>{formatINR(c.expenses)}</td>
                <td className={`${td} ${c.profit < 0 ? "text-destructive" : ""}`}>
                  {signed(c.profit)}
                </td>
                <td className={td}>{pct(c.marginPct)}</td>
                <td className={`${td} font-medium ${c.net < 0 ? "text-destructive" : ""}`}>
                  {signed(c.net)}
                </td>
                <td className={`${td} text-primary`}>{signed(c.whatIfProfit)}</td>
                <td className={`${td} text-primary`}>{pct(c.whatIfMarginPct)}</td>
                <td className={`${td} font-medium ${c.whatIfNet < 0 ? "text-destructive" : "text-primary"}`}>
                  {signed(c.whatIfNet)}
                </td>
              </tr>
            ))}
            <tr className="font-semibold">
              <td className={td}>Total</td>
              <td className={td}>{sum((r) => r.packs)}</td>
              <td className={td}>{kg(sum((r) => r.grams))}</td>
              <td className={td} />
              <td className={td}>{formatINR(totalExpenses)}</td>
              <td className={td}>{signed(totalProfit)}</td>
              <td className={td}>
                {pct(totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : null)}
              </td>
              <td className={td}>{signed(totalProfit - totalExpenses)}</td>
              <td className={`${td} text-primary`}>{signed(totalWhatIfProfit)}</td>
              <td className={`${td} text-primary`}>
                {pct(totalWhatIfRevenue > 0 ? (totalWhatIfProfit / totalWhatIfRevenue) * 100 : null)}
              </td>
              <td className={`${td} text-primary`}>{signed(totalWhatIfProfit - totalExpenses)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        Profit is revenue (net of discounts) less wholesale cost at today&apos;s
        purchase price. Expenses are the period&apos;s overheads (
        {formatINR(expensesTotal)}) plus what the orders cost beyond the goods —
        courier, packing and free goodies, less shipping collected (
        {signed(orderCosts)}) — spread over every packet sold:{" "}
        {formatINR(Math.round(expensePerPack))} a packet. The total after
        expenses is the P&amp;L&apos;s net profit, and equals &ldquo;Margin after
        expenses, per order&rdquo; × orders. The what-if adds the
        increase to every packet at the same volumes — an upper bound, since
        some customers may buy less at a higher price. Extra profit ={" "}
        {totalPacks} × {formatINR(perPack)} = {signed(totalWhatIfProfit - totalProfit)}.
      </p>
    </>
  );
}
