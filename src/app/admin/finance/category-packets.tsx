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
export function CategoryPackets({ categories }: { categories: CategorySales[] }) {
  const [increase, setIncrease] = useState("5");
  const perPack = Math.round((Number(increase) || 0) * 100); // paise

  const rows = categories.map((c) => {
    const extra = c.packs * perPack;
    const profit = c.profit + extra;
    const revenue = c.revenue + extra;
    return { ...c, whatIfProfit: profit, whatIfMarginPct: revenue > 0 ? (profit / revenue) * 100 : null };
  });
  const sum = (f: (r: (typeof rows)[number]) => number) => rows.reduce((s, r) => s + f(r), 0);
  const totalRevenue = sum((r) => r.revenue);
  const totalProfit = sum((r) => r.profit);
  const totalWhatIfProfit = sum((r) => r.whatIfProfit);
  const totalWhatIfRevenue = totalRevenue + sum((r) => r.packs) * perPack;

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
            <tr className="border-b text-xs text-muted-foreground">
              <th className={th}>Category</th>
              <th className={th}>Packets</th>
              <th className={th}>Weight</th>
              <th className={th}>Avg / packet</th>
              <th className={th}>Revenue</th>
              <th className={th}>Profit</th>
              <th className={th}>Margin</th>
              <th className={`${th} text-primary`}>Profit @ +{formatINR(perPack)}</th>
              <th className={`${th} text-primary`}>Margin @ +{formatINR(perPack)}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.category} className="border-b last:border-b-0">
                <td className={td}>{c.category}</td>
                <td className={`${td} font-medium`}>{c.packs}</td>
                <td className={td}>{kg(c.grams)}</td>
                <td className={td}>{formatINR(c.avgPackPrice)}</td>
                <td className={td}>{formatINR(c.revenue)}</td>
                <td className={`${td} ${c.profit < 0 ? "text-destructive" : ""}`}>
                  {signed(c.profit)}
                </td>
                <td className={td}>{pct(c.marginPct)}</td>
                <td className={`${td} font-medium text-primary`}>{signed(c.whatIfProfit)}</td>
                <td className={`${td} text-primary`}>{pct(c.whatIfMarginPct)}</td>
              </tr>
            ))}
            <tr className="font-semibold">
              <td className={td}>Total</td>
              <td className={td}>{sum((r) => r.packs)}</td>
              <td className={td}>{kg(sum((r) => r.grams))}</td>
              <td className={td} />
              <td className={td}>{formatINR(totalRevenue)}</td>
              <td className={td}>{signed(totalProfit)}</td>
              <td className={td}>
                {pct(totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : null)}
              </td>
              <td className={`${td} text-primary`}>{signed(totalWhatIfProfit)}</td>
              <td className={`${td} text-primary`}>
                {pct(totalWhatIfRevenue > 0 ? (totalWhatIfProfit / totalWhatIfRevenue) * 100 : null)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        The what-if adds the increase to every packet sold at the same volumes
        — an upper bound, since some customers may buy less at a higher price.
        Extra profit = packets × increase ({sum((r) => r.packs)} ×{" "}
        {formatINR(perPack)} = {signed(totalWhatIfProfit - totalProfit)}).
      </p>
    </>
  );
}
