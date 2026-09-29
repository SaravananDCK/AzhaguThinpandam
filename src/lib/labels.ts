// Product labels: short selling points shown as pills on the product page
// ("No Palm Oil", "No Preservatives"). Stored on Product.labels as one
// comma-separated string so they edit as plain text, including in the Pricing
// grid's batch mode. Client-safe.

export const MAX_LABELS = 6;
export const MAX_LABEL_LENGTH = 40;

/** Stored/typed text → clean list: trimmed, de-duplicated (case-insensitive), capped. */
export function parseLabels(raw: string | null | undefined): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of (raw ?? "").split(/[,\n]/)) {
    const label = part.trim().replace(/\s+/g, " ").slice(0, MAX_LABEL_LENGTH).trim();
    const key = label.toLowerCase();
    if (!label || seen.has(key)) continue;
    seen.add(key);
    out.push(label);
    if (out.length === MAX_LABELS) break;
  }
  return out;
}

/** Normalised form to store. */
export function normalizeLabels(raw: string | null | undefined): string {
  return parseLabels(raw).join(", ");
}
