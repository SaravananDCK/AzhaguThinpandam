import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/queries";
import { SETTINGS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { SlipsView } from "./slips-view";

export const metadata: Metadata = { title: "Shipping slips" };

// A slip is for a parcel about to go out, so the default is orders awaiting
// dispatch. Already-shipped orders have their label on and gone; they're only
// worth listing when one needs reprinting.
const AWAITING_DISPATCH = ["PAID", "CONFIRMED"];
const WITH_SHIPPED = [...AWAITING_DISPATCH, "SHIPPED"];

type Props = { searchParams: Promise<{ shipped?: string }> };

export default async function ShippingSlipsPage({ searchParams }: Props) {
  const { shipped } = await searchParams;
  const includeShipped = shipped === "1";

  const [orders, settings] = await Promise.all([
    prisma.order.findMany({
      where: { status: { in: includeShipped ? WITH_SHIPPED : AWAITING_DISPATCH } },
      include: { items: { select: { qty: true } } },
      // Oldest first: you pack in the order things came in
      orderBy: { createdAt: "asc" },
      take: 200,
    }),
    getSettings(),
  ]);

  return (
    <div className="print-sheet space-y-5">
      <div className="no-print">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/admin/orders">
            <ArrowLeft className="size-4" /> Orders
          </Link>
        </Button>
        <h1 className="mt-2 font-heading text-2xl font-bold">Shipping slips</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Three slips per A4 sheet — print, cut along the dashed lines and stick
          one on each parcel. Showing{" "}
          {includeShipped ? "orders awaiting dispatch plus already-shipped ones" : "orders awaiting dispatch"}
          , oldest first.
        </p>
        <Button asChild variant="outline" size="sm" className="mt-3">
          <Link href={includeShipped ? "/admin/orders/slips" : "/admin/orders/slips?shipped=1"}>
            {includeShipped ? "Hide shipped orders" : "Include shipped (for reprints)"}
          </Link>
        </Button>
      </div>

      <SlipsView
        from={{
          name: settings[SETTINGS.STORE_NAME],
          address: settings[SETTINGS.STORE_ADDRESS],
          phone: settings[SETTINGS.STORE_PHONE],
        }}
        orders={orders.map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          status: o.status,
          name: o.shipName,
          phone: o.shipPhone,
          line1: o.shipLine1,
          line2: o.shipLine2 ?? "",
          city: o.shipCity,
          state: o.shipState,
          pincode: o.shipPincode,
          itemCount: o.items.reduce((s, i) => s + i.qty, 0),
          createdAt: o.createdAt.toLocaleDateString("en-IN"),
        }))}
      />
    </div>
  );
}
