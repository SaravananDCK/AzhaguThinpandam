import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatINR } from "@/lib/money";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CustomerForm } from "../customer-form";

export const metadata: Metadata = { title: "Edit customer" };

type Props = { params: Promise<{ id: string }> };

export default async function AdminCustomerPage({ params }: Props) {
  const { id } = await params;

  const customer = await prisma.user.findUnique({
    where: { id },
    include: {
      addresses: { orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }], take: 1 },
      orders: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
  if (!customer) notFound();

  const a = customer.addresses[0];

  return (
    <div className="space-y-5">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/admin/customers">
          <ArrowLeft className="size-4" /> Customers
        </Link>
      </Button>
      <div>
        <h1 className="font-heading text-2xl font-bold">
          {customer.name ?? customer.phone ?? "Customer"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Joined{" "}
          {customer.createdAt.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
          {customer.role === "ADMIN" && " · admin account"}
        </p>
      </div>

      <CustomerForm
        values={{
          id: customer.id,
          phone: customer.phone ?? "",
          name: customer.name ?? "",
          email: customer.email ?? "",
          line1: a?.line1 ?? "",
          line2: a?.line2 ?? "",
          city: a?.city ?? "",
          state: a?.state ?? "",
          pincode: a?.pincode ?? "",
          isEmployee: customer.isEmployee,
        }}
      />

      <Card className="max-w-xl">
        <CardContent className="space-y-3">
          <p className="font-semibold">Recent orders</p>
          {customer.orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No orders yet.</p>
          ) : (
            <div className="divide-y">
              {customer.orders.map((o) => (
                <Link
                  key={o.id}
                  href={`/admin/orders/${o.id}`}
                  className="flex items-center justify-between gap-3 py-2 text-sm hover:bg-muted/50"
                >
                  <span className="font-mono">{o.orderNumber}</span>
                  <span className="text-muted-foreground">
                    {o.createdAt.toLocaleDateString("en-IN")}
                  </span>
                  <Badge variant="outline">
                    {ORDER_STATUS_LABELS[o.status as OrderStatus] ?? o.status}
                  </Badge>
                  <span className="font-medium">{formatINR(o.total)}</span>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
