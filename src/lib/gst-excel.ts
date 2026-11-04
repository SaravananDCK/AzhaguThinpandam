import ExcelJS from "exceljs";
import { HSN_UQC, type Gstr1, type HsnRow } from "@/lib/gst-report";

// The month's GSTR-1 working as an Excel workbook. The b2b, b2cl, b2cs, hsn,
// exemp and docs sheets use the GST offline tool's column headings, so rows
// can be pasted straight into it; Summary and Check sit alongside.

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** The offline tool's date format: 03-Aug-2026, in IST. */
function toolDate(d: Date): string {
  const ist = new Date(d.getTime() + IST_OFFSET_MS);
  return `${String(ist.getUTCDate()).padStart(2, "0")}-${MONTHS[ist.getUTCMonth()]}-${ist.getUTCFullYear()}`;
}

const rupees = (paise: number) => Math.round(paise) / 100;

function addSheet(wb: ExcelJS.Workbook, name: string, headers: string[], rows: (string | number)[][]) {
  const ws = wb.addWorksheet(name);
  ws.addRow(headers).font = { bold: true };
  for (const r of rows) ws.addRow(r);
  ws.columns.forEach((c, i) => {
    const widest = Math.max(headers[i].length, ...rows.map((r) => String(r[i] ?? "").length));
    c.width = Math.min(Math.max(widest + 2, 10), 60);
  });
  ws.views = [{ state: "frozen", ySplit: 1 }];
}

function hsnRows(rows: HsnRow[]) {
  return rows.map((h) => [
    h.hsn,
    h.description,
    HSN_UQC,
    h.qty,
    rupees(h.value),
    h.rate,
    rupees(h.taxable),
    rupees(h.igst),
    rupees(h.cgst),
    rupees(h.sgst),
    0,
  ]);
}

const HSN_HEADERS = [
  "HSN",
  "Description",
  "UQC",
  "Total Quantity",
  "Total Value",
  "Rate",
  "Taxable Value",
  "Integrated Tax Amount",
  "Central Tax Amount",
  "State/UT Tax Amount",
  "Cess Amount",
];

export async function gstr1Workbook(r: Gstr1, month: string): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Azhagu Thinpandam admin";

  addSheet(
    wb,
    "Summary",
    ["Item", "Value"],
    [
      ["Return period", month],
      ["Store GSTIN", r.storeGstin || "(not set)"],
      ["Home state", r.homeState],
      ["Invoices (excluding cancelled)", r.totals.invoices],
      ["Invoice value (₹)", rupees(r.totals.value)],
      ["Taxable value (₹)", rupees(r.totals.taxable)],
      ["IGST (₹)", rupees(r.totals.igst)],
      ["CGST (₹)", rupees(r.totals.cgst)],
      ["SGST (₹)", rupees(r.totals.sgst)],
      ["Total tax (₹)", rupees(r.totals.igst + r.totals.cgst + r.totals.sgst)],
    ]
  );

  addSheet(
    wb,
    "b2b",
    [
      "GSTIN/UIN of Recipient",
      "Receiver Name",
      "Invoice Number",
      "Invoice date",
      "Invoice Value",
      "Place Of Supply",
      "Reverse Charge",
      "Applicable % of Tax Rate",
      "Invoice Type",
      "E-Commerce GSTIN",
      "Rate",
      "Taxable Value",
      "Cess Amount",
    ],
    r.b2b.map((b) => [
      b.gstin,
      b.name,
      b.invoiceNumber,
      toolDate(b.date),
      rupees(b.invoiceValue),
      b.pos,
      "N",
      "",
      "Regular B2B",
      "",
      b.rate,
      rupees(b.taxable),
      0,
    ])
  );

  addSheet(
    wb,
    "b2cl",
    [
      "Invoice Number",
      "Invoice date",
      "Invoice Value",
      "Place Of Supply",
      "Applicable % of Tax Rate",
      "Rate",
      "Taxable Value",
      "Cess Amount",
      "E-Commerce GSTIN",
    ],
    r.b2cl.map((b) => [b.invoiceNumber, toolDate(b.date), rupees(b.invoiceValue), b.pos, "", b.rate, rupees(b.taxable), 0, ""])
  );

  addSheet(
    wb,
    "b2cs",
    ["Type", "Place Of Supply", "Applicable % of Tax Rate", "Rate", "Taxable Value", "Cess Amount", "E-Commerce GSTIN"],
    r.b2cs.map((b) => ["OE", b.pos, "", b.rate, rupees(b.taxable), 0, ""])
  );

  addSheet(wb, "hsn(b2b)", HSN_HEADERS, hsnRows(r.hsnB2b));
  addSheet(wb, "hsn(b2c)", HSN_HEADERS, hsnRows(r.hsnB2c));

  addSheet(
    wb,
    "exemp",
    ["Description", "Nil Rated Supplies", "Exempted(other than nil rated/non GST supply)", "Non-GST supplies"],
    r.nil.map((n) => [n.supply, rupees(n.nilRated), 0, 0])
  );

  addSheet(
    wb,
    "docs",
    ["Nature of Document", "Sr. No. From", "Sr. No. To", "Total Number", "Cancelled"],
    r.docs ? [["Invoices for outward supply", r.docs.from, r.docs.to, r.docs.total, r.docs.cancelled]] : []
  );

  addSheet(wb, "Check", ["Fix before filing"], r.warnings.map((w) => [w]));

  return Buffer.from(await wb.xlsx.writeBuffer());
}
