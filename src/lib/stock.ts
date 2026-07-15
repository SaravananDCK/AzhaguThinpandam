// Stock-movement ledger: every change to a variant's stock writes an audit
// row. Call recordMovement AFTER the stock update so balanceAfter is correct.
import { Prisma } from "@prisma/client";

export const STOCK_REASONS = {
  SALE: "SALE",
  CANCEL_RESTOCK: "CANCEL_RESTOCK",
  ADJUSTMENT: "ADJUSTMENT",
  PURCHASE_IN: "PURCHASE_IN",
} as const;

export const STOCK_REASON_LABELS: Record<string, string> = {
  SALE: "Sale",
  CANCEL_RESTOCK: "Cancelled — restocked",
  ADJUSTMENT: "Manual adjustment",
  PURCHASE_IN: "Purchase received",
};

type Tx = Prisma.TransactionClient;

export async function recordMovement(
  tx: Tx,
  params: {
    variantId: string;
    delta: number;
    reason: string;
    reference?: string | null;
    note?: string | null;
  }
) {
  if (params.delta === 0) return;
  const variant = await tx.productVariant.findUnique({
    where: { id: params.variantId },
    select: { stock: true },
  });
  await tx.stockMovement.create({
    data: {
      variantId: params.variantId,
      delta: params.delta,
      balanceAfter: variant?.stock ?? null,
      reason: params.reason,
      reference: params.reference ?? null,
      note: params.note ?? null,
    },
  });
}
