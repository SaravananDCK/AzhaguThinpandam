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
import { Card, CardContent } from "@/components/ui/card";

export type HourPoint = { hour: string; views: number; visitors: number };

export function TrafficCharts({ byHour }: { byHour: HourPoint[] }) {
  return (
    <Card>
      <CardContent>
        <p className="mb-3 font-semibold">Visitors by hour (IST)</p>
        <Chart dataSource={byHour}>
          <CommonSeriesSettings argumentField="hour" />
          <Series valueField="views" name="Page views" type="bar" color="#cf4444" barPadding={0.3} />
          <Series valueField="visitors" name="Unique visitors" type="line" color="#b58527" />
          <ArgumentAxis />
          <ValueAxis allowDecimals={false} />
          <Legend verticalAlignment="bottom" horizontalAlignment="center" />
          <ChartTooltip enabled shared />
        </Chart>
      </CardContent>
    </Card>
  );
}
