import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { lookupCustomerByPhone } from "@/lib/admin-orders";
import { Button } from "@/components/ui/button";
import { NewOrderForm } from "./new-order-form";

export const metadata: Metadata = { title: "New order" };

type Props = { searchParams: Promise<{ phone?: string }> };

export default async function AdminNewOrderPage({ searchParams }: Props) {
  const { phone } = await searchParams;
  // Resolved here rather than in an effect: arriving back from "create
  // customer" should show them already matched, with no client round-trip.
  const initialLookup = phone ? await lookupCustomerByPhone(phone) : null;
  // Everything sellable, so the picker matches what a customer could order
  const variants = await prisma.productVariant.findMany({
    where: { isActive: true, product: { isActive: true } },
    include: { product: { select: { name: true, madeToOrder: true } } },
    orderBy: [{ product: { name: "asc" } }, { label: "asc" }],
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/orders">
            <ArrowLeft className="size-4" /> Orders
          </Link>
        </Button>
      </div>
      <div>
        <h1 className="font-heading text-2xl font-bold">New order</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          For orders taken over WhatsApp. Prices, bundle discounts and shipping
          are calculated exactly as they would be on the website.
        </p>
      </div>
      <NewOrderForm
        initialPhone={phone}
        initialLookup={initialLookup}
        variants={variants.map((v) => ({
          id: v.id,
          label: `${v.product.name} — ${v.label}`,
          price: v.price,
          stock: v.stock,
          madeToOrder: v.product.madeToOrder,
        }))}
      />
    </div>
  );
}
