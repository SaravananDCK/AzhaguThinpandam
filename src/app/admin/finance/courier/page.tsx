import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatINR, paiseToRupees } from "@/lib/money";
import { formatKg } from "@/lib/box";
import { formatDateNumeric } from "@/lib/dates";
import { startOfISTMonth } from "@/lib/finance";
import { buildCourierReport, istDay, parseISTDay } from "@/lib/courier-report";
import { saveCourierCharges } from "./actions";

export const metadata: Metadata = { title: "Courier reconcile" };

const DAY_MS = 24 * 3600 * 1000;
const th = "px-2 py-1.5 font-medium";
const td = "px-2 py-1";

export default async function CourierReconcilePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;
  // Defaults to last month; the courier bills after the month closes
  const from = parseISTDay(params.from) ?? startOfISTMonth(-1);
  const toDay = parseISTDay(params.to) ?? new Date(startOfISTMonth(0).getTime() - DAY_MS);
  const to = new Date(toDay.getTime() + DAY_MS); // inclusive of the last day
  const { rows, totals } = await buildCourierReport(from, to);
  const diff = totals.chargedBilled - totals.courierCost;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="icon" aria-label="Back to Finance">
            <Link href="/admin/finance">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <h1 className="font-heading text-2xl font-bold">Courier reconcile</h1>
            <p className="text-sm text-muted-foreground">
              Parcels in date order, like the courier&apos;s statement. Find each line
              of their bill by date, destination and weight, and type in the amount.
            </p>
          </div>
        </div>
        <form className="flex items-end gap-2 text-sm">
          <label className="space-y-1">
            <span className="block text-xs text-muted-foreground">From</span>
            <Input type="date" name="from" defaultValue={istDay(from)} className="h-8" />
          </label>
          <label className="space-y-1">
            <span className="block text-xs text-muted-foreground">To</span>
            <Input type="date" name="to" defaultValue={istDay(toDay)} className="h-8" />
          </label>
          <Button type="submit" size="sm" variant="outline">
            Show
          </Button>
        </form>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Parcels" value={String(totals.parcels)} />
        <Stat label="Courier bill (entered)" value={formatINR(totals.courierCost)} />
        <Stat label="Delivery charged to customers" value={formatINR(totals.charged)} />
        <Stat
          label={`${diff >= 0 ? "Delivery profit" : "Delivery loss"} (billed parcels)`}
          value={formatINR(Math.abs(diff))}
          tone={diff >= 0 ? "good" : "bad"}
        />
      </div>

      <Card>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No paid orders in these dates.</p>
          ) : (
            <form action={saveCourierCharges} className="space-y-3">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className={th}>Sl.</th>
                      <th className={th}>Date</th>
                      <th className={th}>Destination</th>
                      <th className={th}>Order</th>
                      <th className={`${th} text-right`}>Weight</th>
                      <th className={`${th} text-right`}>Customer paid</th>
                      <th className={`${th} text-right`}>Courier ₹</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => {
                      const day = istDay(r.date);
                      const cost = r.courierCost > 0 ? paiseToRupees(r.courierCost) : "";
                      return (
                        <tr
                          key={r.id}
                          className={`border-b last:border-0 ${r.courierCost === 0 ? "bg-amber-50 dark:bg-amber-950/30" : ""}`}
                        >
                          <td className={`${td} tabular-nums text-muted-foreground`}>{i + 1}</td>
                          <td className={td}>
                            <input type="hidden" name={`was-date:${r.id}`} value={day} />
                            <Input
                              type="date"
                              name={`date:${r.id}`}
                              defaultValue={day}
                              title={
                                r.dateIsGuess
                                  ? "Ship date wasn't recorded — this is the paid date. Correct it if needed."
                                  : `Shipped ${formatDateNumeric(r.date)}`
                              }
                              className={`h-8 w-36 ${r.dateIsGuess ? "border-dashed text-muted-foreground" : ""}`}
                            />
                          </td>
                          <td className={td}>
                            <span className="font-medium uppercase">{r.city}</span>
                            <span className="block text-xs text-muted-foreground">
                              {r.state} · {r.pincode}
                            </span>
                          </td>
                          <td className={td}>
                            <Link href={`/admin/orders/${r.id}`} className="hover:underline">
                              {r.customer}
                            </Link>
                            <span className="block font-mono text-xs text-muted-foreground">
                              {r.orderNumber}
                              {r.preorder && " · pre-order"}
                            </span>
                          </td>
                          <td className={`${td} text-right tabular-nums`}>{formatKg(r.weightKg)}</td>
                          <td className={`${td} text-right tabular-nums`}>
                            {r.charged > 0 ? formatINR(r.charged) : <span className="text-muted-foreground">Free</span>}
                          </td>
                          <td className={`${td} text-right`}>
                            <input type="hidden" name={`was-cost:${r.id}`} value={cost} />
                            <Input
                              type="number"
                              name={`cost:${r.id}`}
                              defaultValue={cost}
                              min={0}
                              step="0.01"
                              placeholder="—"
                              aria-label={`Courier charge for ${r.orderNumber}`}
                              className="ml-auto h-8 w-24 text-right"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t font-semibold">
                      <td className={td} colSpan={4}>
                        Total
                      </td>
                      <td className={`${td} text-right tabular-nums`}>{formatKg(totals.weightKg)}</td>
                      <td className={`${td} text-right tabular-nums`}>{formatINR(totals.charged)}</td>
                      <td className={`${td} text-right tabular-nums`}>{formatINR(totals.courierCost)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  {totals.missing > 0
                    ? `${totals.missing} parcel${totals.missing === 1 ? "" : "s"} (highlighted) with no courier charge yet. `
                    : "Every parcel has a courier charge. "}
                  Weight is the packed goods only; the courier&apos;s weight includes the box.
                  Dashed dates are the paid date, for orders shipped before ship dates were recorded.
                  Compare the total with the courier&apos;s page total.
                </p>
                <Button type="submit" size="sm">
                  <Save className="size-4" /> Save courier charges
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  const color =
    tone === "good" ? "text-green-600 dark:text-green-400" : tone === "bad" ? "text-destructive" : "";
  return (
    <Card>
      <CardContent>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-xl font-semibold tabular-nums ${color}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
