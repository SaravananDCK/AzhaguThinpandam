// GST building blocks shared by the invoice, the Finance page and the GSTR-1
// report: state codes, GSTIN checks and how an order's value splits by rate.
// No database access here, so client forms can import it too.

/** GST state codes, keyed by the names used in INDIAN_STATES. */
export const GST_STATE_CODES: Record<string, string> = {
  "Jammu and Kashmir": "01",
  "Himachal Pradesh": "02",
  Punjab: "03",
  Chandigarh: "04",
  Uttarakhand: "05",
  Haryana: "06",
  Delhi: "07",
  Rajasthan: "08",
  "Uttar Pradesh": "09",
  Bihar: "10",
  Sikkim: "11",
  "Arunachal Pradesh": "12",
  Nagaland: "13",
  Manipur: "14",
  Mizoram: "15",
  Tripura: "16",
  Meghalaya: "17",
  Assam: "18",
  "West Bengal": "19",
  Jharkhand: "20",
  Odisha: "21",
  Chhattisgarh: "22",
  "Madhya Pradesh": "23",
  Gujarat: "24",
  "Dadra and Nagar Haveli and Daman and Diu": "26",
  Maharashtra: "27",
  Karnataka: "29",
  Goa: "30",
  Lakshadweep: "31",
  Kerala: "32",
  "Tamil Nadu": "33",
  Puducherry: "34",
  "Andaman and Nicobar Islands": "35",
  Telangana: "36",
  "Andhra Pradesh": "37",
  Ladakh: "38",
};

/** Used when the store GSTIN isn't set yet. */
export const HOME_STATE_CODE = "33";

const STATE_BY_CODE = Object.fromEntries(Object.entries(GST_STATE_CODES).map(([n, c]) => [c, n]));

export function stateCodeFor(stateName: string): string | null {
  const key = Object.keys(GST_STATE_CODES).find(
    (n) => n.toLowerCase() === stateName.trim().toLowerCase()
  );
  return key ? GST_STATE_CODES[key] : null;
}

/** GSTR-1 place-of-supply format: "33-Tamil Nadu". */
export function placeOfSupply(code: string): string {
  return `${code}-${STATE_BY_CODE[code] ?? "Unknown"}`;
}

export const HSN_PATTERN = /^\d{4,8}$/;

const GSTIN_PATTERN = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const GSTIN_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** Format plus the check digit, so a typo in any one character is caught. */
export function isValidGstin(gstin: string): boolean {
  if (!GSTIN_PATTERN.test(gstin)) return false;
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const p = GSTIN_CHARS.indexOf(gstin[i]) * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(p / 36) + (p % 36);
  }
  return GSTIN_CHARS[(36 - (sum % 36)) % 36] === gstin[14];
}

/** GST component of a GST-INCLUSIVE amount at the given rate (%). Paise in/out. */
export function gstFromInclusive(inclusiveAmount: number, rate: number): number {
  if (!rate || rate <= 0) return 0;
  return Math.round((inclusiveAmount * rate) / (100 + rate));
}

type GstOrder = { discount: number; manualDiscount: number; shippingFee: number };
type GstItem = { price: number; qty: number; gstRate: number | null };

export type GstLine<T> = {
  item: T;
  rate: number;
  value: number; // GST-inclusive amount actually charged for this line, paise
  taxable: number;
  tax: number;
};

/**
 * What each line was really sold for, for GST. Prices are GST-inclusive; the
 * order's discounts reduce the taxable value and its delivery charge is taxed
 * along with the goods, so both are spread across the lines in proportion to
 * their value. The line values add up to exactly the order total.
 */
export function orderGstLines<T extends GstItem>(order: GstOrder, items: T[]): GstLine<T>[] {
  const gross = items.map((i) => i.price * i.qty);
  const grossTotal = gross.reduce((a, b) => a + b, 0);
  const adjust = order.shippingFee - order.discount - order.manualDiscount;
  // The last line with any value takes the rounding remainder
  const last = grossTotal > 0 ? gross.findLastIndex((g) => g > 0) : 0;
  let allocated = 0;
  return items.map((item, idx) => {
    let share = 0;
    if (idx === last) share = adjust - allocated;
    else if (grossTotal > 0) share = Math.round((adjust * gross[idx]) / grossTotal);
    allocated += share;
    const rate = item.gstRate ?? 0;
    const value = gross[idx] + share;
    const tax = gstFromInclusive(value, rate);
    return { item, rate, value, taxable: value - tax, tax };
  });
}

/** CGST and SGST are half each; SGST takes the odd paisa so they sum exactly. */
export function splitIntraState(tax: number): { cgst: number; sgst: number } {
  const cgst = Math.floor(tax / 2);
  return { cgst, sgst: tax - cgst };
}

/** The invoice's GST summary: taxable value and tax per rate, 0% left out. */
export function gstSummaryByRate(order: GstOrder, items: GstItem[]) {
  const byRate = new Map<number, { taxable: number; gst: number }>();
  for (const l of orderGstLines(order, items)) {
    if (!l.rate) continue;
    const e = byRate.get(l.rate) ?? { taxable: 0, gst: 0 };
    e.taxable += l.taxable;
    e.gst += l.tax;
    byRate.set(l.rate, e);
  }
  return byRate;
}
