/**
 * Every date the store shows is in Indian Standard Time, whoever is looking
 * and wherever the code runs. The VPS clock is UTC, so a bare
 * `toLocaleDateString("en-IN")` on the server renders 2:32 am for an order
 * placed at 8:02 am IST; a customer abroad would likewise see their own zone.
 * Always format through these helpers (docker-compose also sets TZ=Asia/Kolkata
 * as a backstop for anything that slips through).
 */
export const IST = "Asia/Kolkata";

type DateInput = Date | string | number;

function toDate(d: DateInput): Date {
  return d instanceof Date ? d : new Date(d);
}

/** 11/9/2026 */
export function formatDateNumeric(d: DateInput): string {
  return toDate(d).toLocaleDateString("en-IN", { timeZone: IST });
}

/** 11 Sept 2026 */
export function formatDate(d: DateInput): string {
  return toDate(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: IST,
  });
}

/** 11 September 2026 */
export function formatDateLong(d: DateInput): string {
  return toDate(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: IST,
  });
}

/** 11 Sept 2026, 8:02 am */
export function formatDateTime(d: DateInput): string {
  return toDate(d).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: IST,
  });
}

/** 2026-09-11 — the IST calendar day, for file names and day keys */
export function istDayKey(d: DateInput = Date.now()): string {
  return new Date(toDate(d).getTime() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
}
