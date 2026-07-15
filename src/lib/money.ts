// All money is stored as integer paise. Format/parse helpers live here.

export function formatINR(paise: number): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: rupees % 1 === 0 ? 0 : 2,
  }).format(rupees);
}

/** Parse a rupee string like "249" or "249.50" into paise. Returns null if invalid. */
export function rupeesToPaise(value: string): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export function paiseToRupees(paise: number): string {
  return (paise / 100).toString();
}
