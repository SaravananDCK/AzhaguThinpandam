import type { Prisma } from "@prisma/client";

// Tax-invoice numbers: AT/26-27/0001, AT/26-27/0002, … — one unbroken series
// per Indian financial year (April to March), restarting at 0001 each April.
// The order number (AT-XXXXXXXX) stays the customer-facing reference; this is
// the number GST paperwork expects to run in sequence.

const INVOICE_PREFIX = "AT";
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** Financial-year label for a moment, in IST: 30 Mar 2027 → "26-27", 1 Apr 2027 → "27-28". */
export function financialYear(at: Date): string {
  const ist = new Date(at.getTime() + IST_OFFSET_MS);
  const start = ist.getUTCMonth() >= 3 ? ist.getUTCFullYear() : ist.getUTCFullYear() - 1;
  const yy = (n: number) => String(n % 100).padStart(2, "0");
  return `${yy(start)}-${yy(start + 1)}`;
}

/**
 * Gives the order its invoice number if it has none yet. Call inside the
 * transaction that captures payment, so the counter bump and the order update
 * commit together and a failed payment never burns a number.
 */
export async function assignInvoiceNumber(tx: Prisma.TransactionClient, orderId: string, at = new Date()) {
  const order = await tx.order.findUnique({ where: { id: orderId }, select: { invoiceNumber: true } });
  if (!order || order.invoiceNumber) return order?.invoiceNumber ?? null;

  const fy = financialYear(at);
  const { last } = await tx.invoiceCounter.upsert({
    where: { fy },
    create: { fy, last: 1 },
    update: { last: { increment: 1 } },
  });
  const invoiceNumber = `${INVOICE_PREFIX}/${fy}/${String(last).padStart(4, "0")}`;
  await tx.order.update({ where: { id: orderId }, data: { invoiceNumber, invoicedAt: at } });
  return invoiceNumber;
}
