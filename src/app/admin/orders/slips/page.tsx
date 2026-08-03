import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/queries";
import { SETTINGS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { SlipsView } from "./slips-view";

export const metadata: Metadata = { title: "Shipping slips" };

// Orders worth printing a slip for — paid and not yet delivered or cancelled
const SHIPPABLE = ["PAID", "CONFIRMED", "SHIPPED"];

export default async function ShippingSlipsPage() {
  const [orders, settings] = await Promise.all([
    prisma.order.findMany({
      where: { status: { in: SHIPPABLE } },
      include: { items: { select: { qty: true } } },
      orderBy: { createdAt: "desc" },
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
          one on each parcel. Showing paid orders that haven&apos;t been delivered yet.
        </p>
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
