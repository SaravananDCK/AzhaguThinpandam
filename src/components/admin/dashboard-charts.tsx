"use client";

import "@/components/admin/dx-setup";
import Chart, {
  ArgumentAxis,
  CommonSeriesSettings,
  Legend,
  Series,
  Tooltip as ChartTooltip,
} from "devextreme-react/chart";
import { Card, CardContent } from "@/components/ui/card";

export type DailyPoint = { day: string; revenue: number }; // ₹
export type TopProduct = { name: string; qty: number };

export function DashboardCharts({
  daily,
  topProducts,
}: {
  daily: DailyPoint[];
  topProducts: TopProduct[];
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardContent>
          <p className="mb-3 font-semibold">Revenue — last 30 days (₹)</p>
          <Chart dataSource={daily} height={260}>
            <CommonSeriesSettings argumentField="day" />
            <Series valueField="revenue" name="Revenue" type="splinearea" color="#8f1e1e" />
            <ArgumentAxis tickInterval={5} />
            <Legend visible={false} />
            <ChartTooltip
              enabled
              format={{ type: "currency", currency: "INR", useCurrencyAccountingStyle: false }}
            />
          </Chart>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <p className="mb-3 font-semibold">Top products — packs sold (30 days)</p>
          {topProducts.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">No sales yet.</p>
          ) : (
            <Chart dataSource={topProducts} rotated height={260}>
              <Series
                argumentField="name"
                valueField="qty"
                type="bar"
                color="#d2a137"
                name="Packs"
              />
              <Legend visible={false} />
              <ChartTooltip enabled />
            </Chart>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
