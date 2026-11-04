import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/money";
import { formatDateNumeric } from "@/lib/dates";
import { monthLabel, monthParamOf, parseMonthParam, startOfISTMonth } from "@/lib/finance";
import { buildGstr1, type HsnRow } from "@/lib/gst-report";

export const metadata: Metadata = { title: "GST returns" };

const num = "px-2 py-1.5 text-right tabular-nums";
const cell = "px-2 py-1.5";

function Section({
  title,
  note,
  headers,
  rows,
}: {
  title: string;
  note?: string;
  headers: string[];
  rows: React.ReactNode[][];
}) {
  return (
    <Card>
      <CardContent className="space-y-2">
        <p className="font-semibold">{title}</p>
        {note && <p className="text-xs text-muted-foreground">{note}</p>}
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing this month.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  {headers.map((h, i) => (
                    <th key={h} className={`${i === 0 ? "text-left" : "text-right"} px-2 py-1.5 font-medium`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-b last:border-0">
                    {r.map((c, j) => (
                      <td key={j} className={j === 0 ? cell : num}>
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function hsnRows(rows: HsnRow[]) {
  return rows.map((h) => [
    <span key="h">
      <span className="font-mono">{h.hsn}</span>
      <span className="block text-xs text-muted-foreground">{h.description}</span>
    </span>,
    h.qty,
    `${h.rate}%`,
    formatINR(h.taxable),
    formatINR(h.igst),
    formatINR(h.cgst),
    formatINR(h.sgst),
  ]);
}

const TAX_HEADERS = ["Taxable", "IGST", "CGST", "SGST"];

export default async function GstReturnsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  // Defaults to last month — the one being filed
  const range = parseMonthParam(month) ?? { from: startOfISTMonth(-1), to: startOfISTMonth(0) };
  const monthParam = monthParamOf(range.from);
  const r = await buildGstr1(range.from, range.to);
  const prevMonth = monthParamOf(new Date(range.from.getTime() - 1));
  const nextMonth = monthParamOf(range.to);
  const totalTax = r.totals.igst + r.totals.cgst + r.totals.sgst;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="icon" aria-label="Back to Finance">
            <Link href={`/admin/finance?month=${monthParam}`}>
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <h1 className="font-heading text-2xl font-bold">GST returns</h1>
        </div>
        <div className="flex items-center gap-1">
          <Button asChild variant="ghost" size="icon" aria-label="Previous month">
            <Link href={`/admin/finance/gst?month=${prevMonth}`}>
              <ChevronLeft className="size-4" />
            </Link>
          </Button>
          <span className="min-w-24 text-center text-sm font-semibold">{monthLabel(range.from)}</span>
          <Button asChild variant="ghost" size="icon" aria-label="Next month">
            <Link href={`/admin/finance/gst?month=${nextMonth}`}>
              <ChevronRight className="size-4" />
            </Link>
          </Button>
          <Button asChild size="sm" className="ml-2">
            <a href={`/api/admin/gst/gstr1?month=${monthParam}`}>
              <Download className="size-4" /> Excel (GSTR-1)
            </a>
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-3 lg:grid-cols-6">
          {[
            ["Invoices", String(r.totals.invoices)],
            ["Invoice value", formatINR(r.totals.value)],
            ["Taxable value", formatINR(r.totals.taxable)],
            ["IGST", formatINR(r.totals.igst)],
            ["CGST + SGST", formatINR(r.totals.cgst + r.totals.sgst)],
            ["Total tax", formatINR(totalTax)],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="font-semibold tabular-nums">{value}</p>
            </div>
          ))}
          <p className="text-xs text-muted-foreground sm:col-span-3 lg:col-span-6">
            Store GSTIN {r.storeGstin || "not set"} · home state {r.homeState}. Tax invoices dated
            in the month; discounts reduce the taxable value and delivery is taxed at the
            goods&apos; rate. Check with your accountant before filing.
          </p>
        </CardContent>
      </Card>

      {r.warnings.length > 0 && (
        <Card className="border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
          <CardContent className="space-y-1.5 text-sm">
            <p className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="size-4" /> Check before filing
            </p>
            <ul className="list-disc space-y-1 pl-5">
              {r.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Section
        title="B2B — registered buyers (4A)"
        note="Orders with a customer GSTIN, one row per invoice and rate. Add the GSTIN under Edit details on the order."
        headers={["Buyer", "Invoice", "Date", "Value", "Place of supply", "Rate", ...TAX_HEADERS]}
        rows={r.b2b.map((b) => [
          <span key="b">
            {b.name}
            <span className="block font-mono text-xs text-muted-foreground">{b.gstin}</span>
          </span>,
          b.invoiceNumber,
          formatDateNumeric(b.date),
          formatINR(b.invoiceValue),
          b.pos,
          `${b.rate}%`,
          formatINR(b.taxable),
          formatINR(b.igst),
          formatINR(b.cgst),
          formatINR(b.sgst),
        ])}
      />

      {r.b2cl.length > 0 && (
        <Section
          title="B2C Large — inter-state above ₹1 lakh (5)"
          headers={["Invoice", "Date", "Value", "Place of supply", "Rate", "Taxable", "IGST"]}
          rows={r.b2cl.map((b) => [
            b.invoiceNumber,
            formatDateNumeric(b.date),
            formatINR(b.invoiceValue),
            b.pos,
            `${b.rate}%`,
            formatINR(b.taxable),
            formatINR(b.igst),
          ])}
        />
      )}

      <Section
        title="B2C Small — unregistered buyers (7)"
        note="All other sales, totalled by place of supply and rate."
        headers={["Place of supply", "Rate", ...TAX_HEADERS]}
        rows={r.b2cs.map((b) => [
          b.pos,
          `${b.rate}%`,
          formatINR(b.taxable),
          formatINR(b.igst),
          formatINR(b.cgst),
          formatINR(b.sgst),
        ])}
      />

      {r.nil.length > 0 && (
        <Section
          title="Nil-rated supplies (8)"
          headers={["Supply", "Value"]}
          rows={r.nil.map((n) => [n.supply, formatINR(n.nilRated)])}
        />
      )}

      <Section
        title="HSN summary — B2B (12)"
        headers={["HSN", "Qty", "Rate", ...TAX_HEADERS]}
        rows={hsnRows(r.hsnB2b)}
      />
      <Section
        title="HSN summary — B2C (12)"
        headers={["HSN", "Qty", "Rate", ...TAX_HEADERS]}
        rows={hsnRows(r.hsnB2c)}
      />

      <Section
        title="Documents issued (13)"
        headers={["Nature of document", "From", "To", "Total", "Cancelled"]}
        rows={
          r.docs
            ? [["Invoices for outward supply", r.docs.from, r.docs.to, r.docs.total, r.docs.cancelled]]
            : []
        }
      />
    </div>
  );
}
