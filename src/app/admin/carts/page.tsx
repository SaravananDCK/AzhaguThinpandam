import Link from "next/link";
import type { Metadata } from "next";
import { MessageCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/money";
import { whatsappNumber } from "@/lib/upi";

export const metadata: Metadata = { title: "Pending Carts" };

/**
 * Carts customers built but never turned into an order — the follow-up list.
 * Every row has a verified phone (login is required before adding to cart),
 * so each one is a WhatsApp tap away. Rows disappear on their own when the
 * customer orders (the cart clears and syncs empty) or empties the cart.
 */
export default async function AdminCartsPage() {
  const lines = await prisma.cartLine.findMany({
    include: {
      user: { select: { id: true, name: true, phone: true, email: true } },
      variant: { select: { label: true, price: true, product: { select: { name: true } } } },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Group into one row per customer
  const byUser = new Map<string, typeof lines>();
  for (const line of lines) {
    const list = byUser.get(line.userId) ?? [];
    list.push(line);
    byUser.set(line.userId, list);
  }

  // A cart alongside an unpaid order usually means they reached checkout and
  // stalled at payment — flag it, that's a different follow-up conversation.
  const pendingOrders = await prisma.order.findMany({
    where: { userId: { in: [...byUser.keys()] }, status: "PENDING" },
    select: { userId: true, orderNumber: true },
  });
  const pendingByUser = new Map(pendingOrders.map((o) => [o.userId, o.orderNumber]));

  const carts = [...byUser.values()]
    .map((cartLines) => ({
      user: cartLines[0].user,
      items: cartLines,
      total: cartLines.reduce((s, l) => s + l.variant.price * l.qty, 0),
      updatedAt: cartLines.reduce(
        (latest, l) => (l.updatedAt > latest ? l.updatedAt : latest),
        cartLines[0].updatedAt
      ),
      pendingOrder: pendingByUser.get(cartLines[0].userId),
    }))
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-xl font-bold">Pending carts</h1>
        <p className="text-sm text-muted-foreground">
          Customers who added items but haven&apos;t ordered. Rows clear themselves
          when they order or empty the cart.
        </p>
      </div>

      {carts.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No pending carts right now.
          </CardContent>
        </Card>
      )}

      {carts.map((cart) => {
        const wa = cart.user.phone ? whatsappNumber(cart.user.phone) : null;
        const itemsText = cart.items
          .map((l) => `${l.variant.product.name} (${l.variant.label}) × ${l.qty}`)
          .join(", ");
        const nudge = wa
          ? `https://wa.me/${wa}?text=${encodeURIComponent(
              `Vanakkam${cart.user.name ? " " + cart.user.name : ""}! Your Azhagu Thinpandam cart is waiting: ${itemsText} — ${formatINR(cart.total)}. Order at ${process.env.NEXT_PUBLIC_APP_URL ?? ""}/cart`
            )}`
          : null;
        return (
          <Card key={cart.user.id}>
            <CardContent className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/admin/customers/${cart.user.id}`}
                  className="font-semibold hover:underline"
                >
                  {cart.user.name ?? cart.user.phone ?? cart.user.email ?? "Customer"}
                </Link>
                {cart.user.phone && (
                  <span className="text-sm text-muted-foreground">{cart.user.phone}</span>
                )}
                <Badge variant="outline">{formatINR(cart.total)}</Badge>
                <span className="text-xs text-muted-foreground">
                  last activity {cart.updatedAt.toLocaleString("en-IN")}
                </span>
                {cart.pendingOrder && (
                  <Badge variant="secondary">
                    unpaid order {cart.pendingOrder} — stalled at payment
                  </Badge>
                )}
              </div>
              <ul className="text-sm text-muted-foreground">
                {cart.items.map((l) => (
                  <li key={l.id}>
                    {l.variant.product.name} ({l.variant.label}) × {l.qty} —{" "}
                    {formatINR(l.variant.price * l.qty)}
                  </li>
                ))}
              </ul>
              {nudge && (
                <Button asChild size="sm" variant="outline">
                  <a href={nudge} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="size-3.5" /> Follow up on WhatsApp
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
