import Link from "next/link";
import { IndianRupee } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getManualPaymentConfig } from "@/lib/queries";
import { isRazorpayConfigured } from "@/lib/razorpay";
import { formatINR } from "@/lib/money";
import { PayNow } from "@/components/store/pay-now";

/**
 * The customer's most recent unpaid order with a working Pay button — shown
 * wherever a buying-minded customer lands (the cart page, the shop's cart
 * sidebar). Most recent only: checkout reuses that same order, so it's the
 * one a fresh checkout would replace, and the full variant's copy says so.
 * Renders nothing when there's no session or nothing pending.
 */
export async function UnpaidOrderNotice({ compact = false }: { compact?: boolean }) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const [unpaid, manual] = await Promise.all([
    prisma.order.findFirst({
      where: { userId: session.user.id, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      include: { payment: true, items: { select: { qty: true } } },
    }),
    getManualPaymentConfig(),
  ]);
  if (!unpaid) return null;

  const gatewayPayable =
    !manual.enabled &&
    isRazorpayConfigured() &&
    !unpaid.payment?.razorpayOrderId.startsWith("SIMULATED");
  const packs = unpaid.items.reduce((s, i) => s + i.qty, 0);

  if (compact) {
    return (
      <div className="mb-4 space-y-2 rounded-xl border border-amber-300 bg-amber-50/60 p-4 dark:border-amber-900 dark:bg-amber-950/40">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <IndianRupee className="size-4" /> Unpaid order
        </p>
        <p className="text-xs text-muted-foreground">
          <span className="font-mono font-medium text-foreground">{unpaid.orderNumber}</span>
          {` · ${packs} ${packs === 1 ? "pack" : "packs"} · ${formatINR(unpaid.total)}`}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {gatewayPayable && (
            <PayNow orderNumber={unpaid.orderNumber} total={unpaid.total} size="sm" />
          )}
          <Link
            href={`/order/${unpaid.orderNumber}`}
            className="text-xs font-medium text-primary underline-offset-2 hover:underline"
          >
            View order
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 pt-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border border-amber-300 bg-amber-50/60 p-4 dark:border-amber-900 dark:bg-amber-950/40">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 font-semibold">
            <IndianRupee className="size-4" /> You have an unpaid order
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            <span className="font-mono font-medium text-foreground">{unpaid.orderNumber}</span>
            {` · ${packs} ${packs === 1 ? "pack" : "packs"} · ${formatINR(unpaid.total)} — `}
            pay it to confirm, or check out below and it&apos;ll be replaced with
            this cart.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {gatewayPayable && <PayNow orderNumber={unpaid.orderNumber} total={unpaid.total} />}
          <Link
            href={`/order/${unpaid.orderNumber}`}
            className="text-sm font-medium text-primary underline-offset-2 hover:underline"
          >
            View order
          </Link>
        </div>
      </div>
    </div>
  );
}
