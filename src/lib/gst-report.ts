// Monthly GSTR-1 working: every tax invoice dated in the month, split into the
// return's sections (B2B, B2C large, B2C small, nil-rated, HSN summary,
// documents issued). Amounts in paise; rates in %. The admin page and the
// Excel download both read this, so they always agree.
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/queries";
import { SETTINGS } from "@/lib/constants";
import { REVENUE_STATUSES } from "@/lib/finance";
import {
  HOME_STATE_CODE,
  orderGstLines,
  placeOfSupply,
  splitIntraState,
  stateCodeFor,
} from "@/lib/gst";

/**
 * An inter-state sale to an unregistered buyer above this invoice value is
 * "B2C (Large)" and reported invoice by invoice (₹1 lakh since August 2024).
 */
export const B2CL_THRESHOLD = 1_00_000_00;

/** Unit for the HSN summary: snacks are sold by the pack. */
export const HSN_UQC = "NOS-NUMBERS";

type Tax = { taxable: number; igst: number; cgst: number; sgst: number };

export type B2bRow = Tax & {
  gstin: string;
  name: string;
  invoiceNumber: string;
  orderNumber: string;
  date: Date;
  invoiceValue: number;
  pos: string;
  rate: number;
};
export type B2clRow = Tax & {
  invoiceNumber: string;
  orderNumber: string;
  date: Date;
  invoiceValue: number;
  pos: string;
  rate: number;
};
export type B2csRow = Tax & { pos: string; rate: number };
export type HsnRow = Tax & {
  hsn: string;
  description: string;
  rate: number;
  qty: number;
  value: number;
};
export type NilRow = { supply: string; nilRated: number };
export type DocsRow = { from: string; to: string; total: number; cancelled: number };

export type Gstr1 = {
  storeGstin: string;
  homeState: string;
  b2b: B2bRow[];
  b2cl: B2clRow[];
  b2cs: B2csRow[];
  hsnB2b: HsnRow[];
  hsnB2c: HsnRow[];
  nil: NilRow[];
  docs: DocsRow | null;
  totals: Tax & { invoices: number; value: number };
  /** Things to fix before filing — the report still adds up without them. */
  warnings: string[];
};

function zeroTax(): Tax {
  return { taxable: 0, igst: 0, cgst: 0, sgst: 0 };
}

function addTax(into: Tax, t: Tax) {
  into.taxable += t.taxable;
  into.igst += t.igst;
  into.cgst += t.cgst;
  into.sgst += t.sgst;
}

function seqOf(invoiceNumber: string): number {
  return parseInt(invoiceNumber.split("/").pop() ?? "0", 10) || 0;
}

export async function buildGstr1(from: Date, to: Date): Promise<Gstr1> {
  const [orders, settings] = await Promise.all([
    prisma.order.findMany({
      where: { invoiceNumber: { not: null }, invoicedAt: { gte: from, lt: to } },
      include: {
        items: { include: { variant: { select: { product: { select: { hsn: true } } } } } },
      },
      orderBy: { invoicedAt: "asc" },
    }),
    getSettings(),
  ]);

  const storeGstin = settings[SETTINGS.STORE_GSTIN] ?? "";
  const defaultHsn = settings[SETTINGS.DEFAULT_HSN] ?? "";
  const homeCode = storeGstin ? storeGstin.slice(0, 2) : HOME_STATE_CODE;
  const warnings: string[] = [];
  if (!storeGstin) warnings.push("Store GSTIN isn't set in Settings — Tamil Nadu is assumed as the home state.");

  const b2b: B2bRow[] = [];
  const b2cl: B2clRow[] = [];
  const b2cs = new Map<string, B2csRow>();
  const hsn = { b2b: new Map<string, HsnRow>(), b2c: new Map<string, HsnRow>() };
  const nil = new Map<string, number>();
  const totals = { ...zeroTax(), invoices: 0, value: 0 };
  const cancelled: string[] = [];
  const missingHsn = new Set<string>();

  for (const o of orders) {
    const invoiceNumber = o.invoiceNumber!;
    // Cancelled, or moved back to payment-pending after a mistaken "paid": the
    // number was issued, so it shows as cancelled in Documents issued.
    if (!REVENUE_STATUSES.includes(o.status)) {
      cancelled.push(invoiceNumber);
      continue;
    }
    const date = o.invoicedAt ?? o.createdAt;
    let posCode = stateCodeFor(o.shipState);
    if (!posCode) {
      warnings.push(`${invoiceNumber}: delivery state "${o.shipState}" isn't a known state — counted as ${placeOfSupply(homeCode)}.`);
      posCode = homeCode;
    }
    const pos = placeOfSupply(posCode);
    const interState = posCode !== homeCode;
    const isB2b = !!o.gstin;
    if (isB2b && o.gstin!.slice(0, 2) !== posCode) {
      warnings.push(`${invoiceNumber}: GSTIN ${o.gstin} is registered in another state than the delivery address (${o.shipState}). Check the place of supply.`);
    }
    totals.invoices += 1;
    totals.value += o.total;

    // Per-rate tax for this invoice
    const byRate = new Map<number, Tax>();
    for (const l of orderGstLines(o, o.items)) {
      if (l.value === 0) continue;
      const t: Tax = interState
        ? { taxable: l.taxable, igst: l.tax, cgst: 0, sgst: 0 }
        : { taxable: l.taxable, igst: 0, ...splitIntraState(l.tax) };
      addTax(totals, t);

      if (l.rate === 0) {
        const key = `${interState ? "Inter" : "Intra"}-State supplies to ${isB2b ? "registered" : "unregistered"} persons`;
        nil.set(key, (nil.get(key) ?? 0) + l.value);
      } else {
        const r = byRate.get(l.rate) ?? zeroTax();
        addTax(r, t);
        byRate.set(l.rate, r);
      }

      let code = l.item.variant?.product.hsn || defaultHsn;
      if (!code) {
        missingHsn.add(l.item.productName);
        code = "(none)";
      }
      const hsnMap = isB2b ? hsn.b2b : hsn.b2c;
      const hk = `${code}|${l.rate}`;
      const h = hsnMap.get(hk) ?? { hsn: code, description: "", rate: l.rate, qty: 0, value: 0, ...zeroTax() };
      h.qty += l.item.qty;
      h.value += l.value;
      addTax(h, t);
      if (!h.description.includes(l.item.productName) && h.description.length < 60) {
        h.description = h.description ? `${h.description}, ${l.item.productName}` : l.item.productName;
      }
      hsnMap.set(hk, h);
    }

    for (const [rate, t] of byRate) {
      if (isB2b) {
        b2b.push({ gstin: o.gstin!, name: o.gstName ?? o.shipName, invoiceNumber, orderNumber: o.orderNumber, date, invoiceValue: o.total, pos, rate, ...t });
      } else if (interState && o.total > B2CL_THRESHOLD) {
        b2cl.push({ invoiceNumber, orderNumber: o.orderNumber, date, invoiceValue: o.total, pos, rate, ...t });
      } else {
        const key = `${pos}|${rate}`;
        const row = b2cs.get(key) ?? { pos, rate, ...zeroTax() };
        addTax(row, t);
        b2cs.set(key, row);
      }
    }
  }

  if (missingHsn.size) {
    const names = [...missingHsn];
    const list = names.length > 5 ? `${names.slice(0, 5).join(", ")} and ${names.length - 5} more` : names.join(", ");
    warnings.push(`No HSN code for ${list} — set one on the product or a default in Settings.`);
  }
  if (cancelled.length) {
    warnings.push(`Cancelled or unpaid after invoicing (left out of the tables, counted as cancelled in Documents): ${cancelled.join(", ")}. Refunds need a credit note, which isn't generated here.`);
  }

  const numbers = orders.map((o) => o.invoiceNumber!).sort((a, b) => seqOf(a) - seqOf(b));
  const docs = numbers.length
    ? { from: numbers[0], to: numbers[numbers.length - 1], total: numbers.length, cancelled: cancelled.length }
    : null;

  const byPosRate = (a: { pos: string; rate: number }, b: { pos: string; rate: number }) =>
    a.pos.localeCompare(b.pos) || a.rate - b.rate;
  const byHsn = (a: HsnRow, b: HsnRow) => a.hsn.localeCompare(b.hsn) || a.rate - b.rate;

  return {
    storeGstin,
    homeState: placeOfSupply(homeCode),
    b2b,
    b2cl,
    b2cs: [...b2cs.values()].sort(byPosRate),
    hsnB2b: [...hsn.b2b.values()].sort(byHsn),
    hsnB2c: [...hsn.b2c.values()].sort(byHsn),
    nil: [...nil.entries()].map(([supply, nilRated]) => ({ supply, nilRated })),
    docs,
    totals,
    warnings,
  };
}
