import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatINR } from "@/lib/money";
import { ORDER_STATUS_LABELS } from "@/lib/constants";
import type { OrderAnalytics } from "@/lib/finance-analytics";

const pct = (v: number | null) => (v == null ? "—" : `${v.toFixed(1)}%`);

function signed(amount: number): string {
  return `${amount < 0 ? "−" : ""}${formatINR(Math.abs(amount))}`;
}

function kg(grams: number): string {
  if (!grams) return "—";
  return `${(grams / 1000).toLocaleString("en-IN", { maximumFractionDigits: 2 })} kg`;
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-lg font-semibold">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

const th = "px-2 py-1.5 text-right font-medium first:text-left";
const td = "px-2 py-1.5 text-right first:text-left";

export function OrderAnalysis({
  data,
  month,
  expensesTotal,
}: {
  data: OrderAnalytics;
  month: string;
  /** Overheads in the period (Expenses table + supplier-billed transport), paise */
  expensesTotal: number;
}) {
  const expensesPerOrder = data.paidOrders ? Math.round(expensesTotal / data.paidOrders) : 0;
  const share = (n: number) =>
    data.paidOrders ? ` (${Math.round((n / data.paidOrders) * 100)}%)` : "";

  return (
    <>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardContent className="space-y-2.5">
            <div>
              <p className="font-semibold">Orders — {month}</p>
              <p className="text-xs text-muted-foreground">
                Orders placed this month, by the status they have now.
              </p>
            </div>
            {data.byStatus.map((s) => (
              <div key={s.status} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{ORDER_STATUS_LABELS[s.status]}</span>
                <span>
                  <span className="font-medium">{s.count}</span>
                  <span className="ml-2 inline-block min-w-20 text-right text-muted-foreground">
                    {formatINR(s.value)}
                  </span>
                </span>
              </div>
            ))}
            <Separator />
            <div className="flex justify-between text-sm font-semibold">
              <span>Total placed</span>
              <span>{data.totalPlaced}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Counted as sales (paid, confirmed, shipped, delivered)
              </span>
              <span className="font-medium">{data.paidOrders}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3">
            <div>
              <p className="font-semibold">Per-order averages — {month}</p>
              <p className="text-xs text-muted-foreground">
                Across the {data.paidOrders} orders counted as sales.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Average order value" value={formatINR(data.avgOrderValue)} />
              <Stat
                label="Average margin per order"
                value={signed(data.avgMargin)}
                hint={`${pct(data.marginPct)} of goods revenue`}
              />
              <Stat label="Total margin" value={signed(data.totalMargin)} />
              <Stat label="Discounts given" value={formatINR(data.discountsGiven)} />
              <Stat
                label="Shipping collected − courier cost"
                value={signed(data.shippingDelta)}
                hint={
                  data.ordersMissingCourierCost
                    ? `${data.ordersMissingCourierCost} orders without a courier cost left out`
                    : undefined
                }
              />
              <Stat
                label="Average expenses per order"
                value={formatINR(expensesPerOrder)}
                hint={`${formatINR(expensesTotal)} overheads ÷ ${data.paidOrders} orders`}
              />
              <Stat
                label="Margin after expenses, per order"
                value={signed(data.avgMargin - expensesPerOrder)}
                hint="Average margin − average expenses"
              />
              <Stat
                label="New / repeat customers"
                value={`${data.newCustomerOrders} / ${data.repeatCustomerOrders}`}
                hint={`Repeat${share(data.repeatCustomerOrders)} of orders`}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Margin = goods revenue + shipping collected − wholesale cost at
              today&apos;s purchase price − packing − courier. Expenses are the
              month&apos;s overheads from the Expenses table (and supplier-billed
              transport) spread evenly over the orders. Stock purchases are not
              included, so this won&apos;t match the P&amp;L&apos;s net profit.
            </p>
            {data.ordersWithUnknownCost > 0 && (
              <p className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                {data.ordersWithUnknownCost} orders include a product with no purchase
                price, so margin is overstated. Set the missing prices in Pricing.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="space-y-3">
          <div>
            <p className="font-semibold">Profit by product — {month}</p>
            <p className="text-xs text-muted-foreground">
              Revenue is net of each order&apos;s discounts; cost is the wholesale
              cost at today&apos;s purchase price. Packing and courier are not
              split across products.
            </p>
          </div>
          {data.products.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No sales in this period.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className={th}>Product</th>
                    <th className={th}>Packs</th>
                    <th className={th}>Weight</th>
                    <th className={th}>Revenue</th>
                    <th className={th}>Cost</th>
                    <th className={th}>Profit</th>
                    <th className={th}>Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {data.products.map((p) => (
                    <tr key={p.name} className="border-b last:border-b-0">
                      <td className={td}>
                        {p.name}
                        {p.unknownLines > 0 && (
                          <span
                            className="ml-1.5 text-xs text-amber-700 dark:text-amber-400"
                            title="No purchase price on record — cost is understated"
                          >
                            cost missing
                          </span>
                        )}
                      </td>
                      <td className={td}>{p.packs}</td>
                      <td className={td}>{kg(p.grams)}</td>
                      <td className={td}>{formatINR(p.revenue)}</td>
                      <td className={td}>{formatINR(p.cost)}</td>
                      <td className={`${td} font-medium ${p.profit < 0 ? "text-destructive" : ""}`}>
                        {signed(p.profit)}
                      </td>
                      <td className={td}>{pct(p.marginPct)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {data.freebieCost > 0 && (
            <p className="text-xs text-muted-foreground">
              Free goodies given away cost {formatINR(data.freebieCost)} — counted in
              the order margins above, not against any product here.
            </p>
          )}
        </CardContent>
      </Card>

      {data.states.length > 0 && (
        <Card>
          <CardContent className="space-y-3">
            <div>
              <p className="font-semibold">Sales by state — {month}</p>
              <p className="text-xs text-muted-foreground">
                Shows where a delivery charge isn&apos;t covering the courier.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className={th}>State</th>
                    <th className={th}>Orders</th>
                    <th className={th}>Goods revenue</th>
                    <th className={th}>Shipping collected</th>
                    <th className={th}>Courier cost</th>
                    <th className={th}>Difference</th>
                  </tr>
                </thead>
                <tbody>
                  {data.states.map((s) => {
                    const diff = s.shippingIncome - s.shippingCost;
                    return (
                      <tr key={s.state} className="border-b last:border-b-0">
                        <td className={td}>{s.state}</td>
                        <td className={td}>{s.orders}</td>
                        <td className={td}>{formatINR(s.revenue)}</td>
                        <td className={td}>{formatINR(s.shippingIncome)}</td>
                        <td className={td}>{formatINR(s.shippingCost)}</td>
                        <td className={`${td} font-medium ${diff < 0 ? "text-destructive" : ""}`}>
                          {signed(diff)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
