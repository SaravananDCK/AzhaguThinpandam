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
  searchParams: Promise<{ number?: string; email?: string; notfound?: string }>;
};

export default async function TrackOrderPage({ searchParams }: Props) {
  const { number, email, notfound } = await searchParams;

  if (number && email) {
    const order = await prisma.order.findFirst({
      where: {
        orderNumber: number.trim().toUpperCase(),
        email: email.trim().toLowerCase(),
      },
    });
    if (order) redirect(`/order/${order.orderNumber}`);
    redirect(
      `/track-order?notfound=1&number=${encodeURIComponent(number)}&email=${encodeURIComponent(email)}`
    );
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-12">
      <div className="mb-6 text-center">
        <PackageSearch className="mx-auto size-10 text-primary" />
        <h1 className="mt-3 font-heading text-2xl font-bold">Track your order</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter your order number and the email used at checkout.
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
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            {notfound && (
              <p className="text-sm text-destructive">
                No order found for that number and email. Please check and try again.
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
