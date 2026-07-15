"use client";

import "@/components/admin/dx-setup";
import Chart, {
  ArgumentAxis,
  CommonSeriesSettings,
  Legend,
  Series,
  Tooltip as ChartTooltip,
  ValueAxis,
} from "devextreme-react/chart";
import PieChart, {
  Label as PieLabel,
  Legend as PieLegend,
  Series as PieSeries,
  Tooltip as PieTooltip,
} from "devextreme-react/pie-chart";
import { Card, CardContent } from "@/components/ui/card";

export type MonthlyPoint = {
  month: string;
  revenue: number; // ₹ (rupees, for display)
  costs: number;
  profit: number;
};

export type ExpenseSlice = { category: string; amount: number }; // ₹

const BRAND_PALETTE = ["#8f1e1e", "#d2a137", "#64b153", "#797f8d", "#cf4444", "#ddb75f", "#3d414b"];

export function FinanceCharts({
  monthly,
  expenseSlices,
}: {
  monthly: MonthlyPoint[];
  expenseSlices: ExpenseSlice[];
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card>
        <CardContent>
          <p className="mb-3 font-semibold">Last 6 months (₹)</p>
          <Chart dataSource={monthly} palette={BRAND_PALETTE}>
            <CommonSeriesSettings argumentField="month" type="bar" barPadding={0.2} />
            <Series valueField="revenue" name="Revenue" />
            <Series valueField="costs" name="Costs" />
            <Series valueField="profit" name="Profit" type="line" color="#64b153" />
            <ArgumentAxis />
            <ValueAxis />
            <Legend verticalAlignment="bottom" horizontalAlignment="center" />
            <ChartTooltip
              enabled
              format={{ type: "currency", currency: "INR", useCurrencyAccountingStyle: false }}
            />
          </Chart>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <p className="mb-3 font-semibold">Expenses this period</p>
          {expenseSlices.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              No expenses recorded in this period.
            </p>
          ) : (
            <PieChart dataSource={expenseSlices} type="doughnut" palette={BRAND_PALETTE}>
              <PieSeries argumentField="category" valueField="amount">
                <PieLabel visible customizeText={(p) => `${p.argumentText}: ₹${p.valueText}`} />
              </PieSeries>
              <PieLegend verticalAlignment="bottom" horizontalAlignment="center" />
              <PieTooltip enabled />
            </PieChart>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
