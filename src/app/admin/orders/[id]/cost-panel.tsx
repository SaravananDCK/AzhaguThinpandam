import { AlertTriangle, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatINR } from "@/lib/money";
import type { OrderCost } from "@/lib/order-cost";

/**
 * Internal margin view — never shown to the customer, and excluded from print.
 * The point is the discount headroom: how far the price can move before the
 * order stops making money.
 */
export function CostPanel({ cost }: { cost: OrderCost }) {
  const loss = cost.margin < 0;

  return (
    <Card className="no-print">
      <CardContent className="space-y-3 text-sm">
        <p className="flex items-center gap-2 font-semibold">
          <TrendingUp className="size-4" /> Cost &amp; margin
          <span className="ml-auto text-xs font-normal text-muted-foreground">
            internal — not shown to the customer
          </span>
        </p>

        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Goods cost (wholesale)</span>
            <span>{formatINR(cost.goodsCost)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Packing cost</span>
            <span>{formatINR(cost.packingCost)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Courier cost</span>
            <span>{formatINR(cost.shippingCost)}</span>
          </div>
          <div className="flex justify-between border-t pt-1 font-medium">
            <span>Total cost</span>
            <span>{formatINR(cost.totalCost)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Goods revenue after discount</span>
            <span>{formatINR(cost.netRevenue)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Shipping collected</span>
            <span>
              {formatINR(cost.shippingIncome)}
              {cost.shippingCost > 0 && (
                <span
                  className={`ml-1.5 text-xs ${
                    cost.shippingDelta < 0
                      ? "text-destructive"
                      : "text-muted-foreground"
                  }`}
                >
                  ({cost.shippingDelta < 0 ? "−" : "+"}
                  {formatINR(Math.abs(cost.shippingDelta))} vs courier)
                </span>
              )}
            </span>
          </div>
          <div
            className={`flex justify-between border-t pt-1 text-base font-semibold ${
              loss ? "text-destructive" : "text-green-700 dark:text-green-400"
            }`}
          >
            <span>{loss ? "Loss" : "Margin"}</span>
            <span>
              {formatINR(cost.margin)}
              {cost.marginPct !== null && (
                <span className="ml-1.5 text-xs font-normal">
                  ({cost.marginPct.toFixed(1)}%)
                </span>
              )}
            </span>
          </div>
        </div>

        {cost.shippingCostMissing && (
          <p className="flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/50 dark:text-amber-100">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            <span>
              No courier cost recorded. Enter what the courier actually charged
              in the order totals above — a flat{" "}
              {formatINR(cost.shippingIncome)} collected can easily be less than
              a heavy parcel costs to send.
            </span>
          </p>
        )}

        {/* Only claim headroom when every cost is actually known — otherwise
            this is the number that talks you into a losing discount */}
        {!loss && cost.margin > 0 && cost.unknownLines === 0 && !cost.shippingCostMissing && (
          <p className="rounded-md bg-secondary px-3 py-2 text-xs">
            You can discount up to{" "}
            <span className="font-semibold">{formatINR(cost.margin)}</span> more
            on this order before it stops making money.
          </p>
        )}

        {cost.unknownLines > 0 && (
          <p className="flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/50 dark:text-amber-100">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            <span>
              {cost.unknownLines} item{cost.unknownLines === 1 ? " has" : "s have"} a
              wholesale price of zero or unset, or a non-weight pack size — so
              the cost above is understated and the real margin is{" "}
              <strong>lower than shown</strong>. Don&apos;t base a discount on
              this figure until the purchase price per kg is set in{" "}
              <strong>Admin → Pricing</strong>.
            </span>
          </p>
        )}

        <p className="text-xs text-muted-foreground">
          Uses each product&apos;s current wholesale price per kg, so it reflects
          today&apos;s costs rather than what you paid at the time. Shipping is
          excluded from both sides.
        </p>
      </CardContent>
    </Card>
  );
}
