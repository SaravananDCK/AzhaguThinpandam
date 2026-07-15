import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/money";
import {
  computePnL,
  monthLabel,
  monthParamOf,
  parseMonthParam,
  startOfISTMonth,
} from "@/lib/finance";
import { FinanceCharts } from "@/components/admin/finance-charts";

export const metadata: Metadata = { title: "Finance" };

function Row({
  label,
  amount,
  negative,
  bold,
}: {
  label: string;
  amount: number;
  negative?: boolean;
  bold?: boolean;
}) {
  return (
    <div className={`flex justify-between text-sm ${bold ? "font-semibold" : ""}`}>
      <span className={bold ? "" : "text-muted-foreground"}>{label}</span>
      <span className={negative ? "text-destructive" : undefined}>
        {negative && amount > 0 ? "−" : ""}
        {formatINR(amount)}
      </span>
    </div>
  );
}

export default async function AdminFinancePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  const range = parseMonthParam(month) ?? {
    from: startOfISTMonth(0),
    to: startOfISTMonth(1),
  };

  const [pnl, allTime, ...history] = await Promise.all([
    computePnL(range.from, range.to),
    computePnL(new Date(0), new Date()),
    ...[-5, -4, -3, -2, -1, 0].map((o) =>
      computePnL(startOfISTMonth(o), startOfISTMonth(o + 1))
    ),
  ]);

  const prevMonth = monthParamOf(new Date(range.from.getTime() - 1));
  const nextMonth = monthParamOf(range.to);
  const monthly = history.map((h) => ({
    month: monthLabel(h.from),
    revenue: Math.round((h.revenue + h.shippingIncome) / 100),
    costs: Math.round((h.cogs + h.packing + h.expensesTotal) / 100),
    profit: Math.round(h.netProfit / 100),
  }));
  const expenseSlices = pnl.expenses.map((e) => ({
    category: e.category,
    amount: Math.round(e.amount / 100),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-bold">Finance</h1>
        <div className="flex items-center gap-1">
          <Button asChild variant="ghost" size="icon" aria-label="Previous month">
            <Link href={`/admin/finance?month=${prevMonth}`}>
              <ChevronLeft className="size-4" />
            </Link>
          </Button>
          <span className="min-w-24 text-center text-sm font-semibold">
            {monthLabel(range.from)}
          </span>
          <Button asChild variant="ghost" size="icon" aria-label="Next month">
            <Link href={`/admin/finance?month=${nextMonth}`}>
              <ChevronRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* P&L for the selected month */}
        <Card>
          <CardContent className="space-y-2.5">
            <p className="font-semibold">Profit &amp; Loss — {monthLabel(range.from)}</p>
            <Row label={`Product revenue (${pnl.orderCount} orders, net of discounts)`} amount={pnl.revenue} />
            <Row label="Shipping collected" amount={pnl.shippingIncome} />
            <Separator />
            <Row label="Stock purchases (COGS)" amount={pnl.cogs} negative />
            <Row label="Packing costs" amount={pnl.packing} negative />
            {pnl.expenses.map((e) => (
              <Row key={e.category} label={e.category} amount={e.amount} negative />
            ))}
            <Separator />
            <Row label="Net profit" amount={pnl.netProfit} bold negative={pnl.netProfit < 0} />
          </CardContent>
        </Card>

        {/* Position summary, all-time */}
        <Card>
          <CardContent className="space-y-2.5">
            <p className="font-semibold">Financial position — all time</p>
            <Row
              label={`Total collected (${allTime.orderCount} orders incl. shipping)`}
              amount={allTime.revenue + allTime.shippingIncome}
            />
            <Row label="Total stock purchases" amount={allTime.cogs} negative />
            <Row label="Total packing costs" amount={allTime.packing} negative />
            <Row label="Total expenses" amount={allTime.expensesTotal} negative />
            <Separator />
            <Row label="Net position" amount={allTime.netProfit} bold negative={allTime.netProfit < 0} />
            <p className="pt-1 text-xs text-muted-foreground">
              Cash-basis summary: purchases count as cost when bought, not when
              sold. Unsold stock on the shelf is therefore not shown as an asset
              here — your true position is this number plus inventory on hand.
            </p>
          </CardContent>
        </Card>
      </div>

      <FinanceCharts monthly={monthly} expenseSlices={expenseSlices} />
    </div>
  );
}
