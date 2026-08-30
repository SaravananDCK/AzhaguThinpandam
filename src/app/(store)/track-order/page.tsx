import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { PackageSearch } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const metadata: Metadata = { title: "Track Order" };

type Props = {
  searchParams: Promise<{ number?: string; contact?: string; notfound?: string }>;
};

/** 10-digit Indian mobile, however it was typed (+91, spaces, dashes). */
function asPhone(contact: string): string | null {
  const digits = contact.replace(/\D/g, "").slice(-10);
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

export default async function TrackOrderPage({ searchParams }: Props) {
  const { number, contact, notfound } = await searchParams;

  if (number && contact?.trim()) {
    // Email or mobile: an email address is optional at checkout, so orders
    // placed without one are found by the delivery number instead. Never match
    // on an empty email — that would open every email-less order.
    const phone = asPhone(contact);
    const order = await prisma.order.findFirst({
      where: {
        orderNumber: number.trim().toUpperCase(),
        ...(phone ? { shipPhone: phone } : { email: contact.trim().toLowerCase() }),
      },
    });
    if (order) redirect(`/order/${order.orderNumber}`);
    redirect(
      `/track-order?notfound=1&number=${encodeURIComponent(number)}&contact=${encodeURIComponent(contact)}`
    );
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-12">
      <div className="mb-6 text-center">
        <PackageSearch className="mx-auto size-10 text-primary" />
        <h1 className="mt-3 font-heading text-2xl font-bold">Track your order</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter your order number and the mobile number or email used at
          checkout.
        </p>
      </div>
      <Card>
        <CardContent>
          <form method="GET" className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="number">Order number</Label>
              <Input
                id="number"
                name="number"
                required
                placeholder="AT-XXXXXXXX"
                defaultValue={notfound ? "" : undefined}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="contact">Mobile number or email</Label>
              <Input id="contact" name="contact" required placeholder="9876543210" />
            </div>
            {notfound && (
              <p className="text-sm text-destructive">
                No order found for that number and contact. Please check and try again.
              </p>
            )}
            <Button type="submit" className="w-full">
              Track order
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
