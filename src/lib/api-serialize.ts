import type { Order, OrderItem, Payment } from "@prisma/client";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/constants";
import { isSellable, sellableQty } from "@/lib/availability";
import { parseLabels } from "@/lib/labels";
import { basePacketGrams } from "@/lib/pack";
import type { ProductWithDetails } from "@/lib/queries";

// JSON shapes for the mobile app (/api/v1). Kept apart from the Prisma models
// on purpose: the app is installed on phones we can't update at will, so these
// shapes must stay stable even when a column is renamed. Money is integer
// paise everywhere, as in the rest of the codebase.

/** Uploaded images are stored as site-relative paths; the app needs the full address. */
export function absoluteUrl(path: string | null | undefined, origin: string): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${origin}${path.startsWith("/") ? "" : "/"}${path}`;
}

/** Public origin for links handed to the app: the configured site URL, else this request's. */
export function apiOrigin(req: Request): string {
  const configured = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  return configured || new URL(req.url).origin;
}

export function serializeProduct(p: ProductWithDetails, origin: string) {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    tamilName: p.tamilName,
    description: p.description,
    category: { slug: p.category.slug, name: p.category.name },
    line: p.line,
    labels: parseLabels(p.labels),
    isFlagship: p.isFlagship,
    madeToOrder: p.madeToOrder,
    preorder: p.preorder,
    ratingAvg: p.ratingAvg,
    ratingCount: p.ratingCount,
    images: p.images.map((i) => absoluteUrl(i.url, origin)),
    /** Base packet size for the "N × 250 g packets" delivery note; null when not weight-based */
    packetGrams: basePacketGrams(p.variants.map((v) => v.label)) ?? null,
    inStock: p.variants.some((v) => isSellable(v.stock, p.madeToOrder)),
    variants: p.variants.map((v) => ({
      id: v.id,
      label: v.label,
      price: v.price,
      mrp: v.mrp,
      weightGrams: v.weightGrams,
      available: isSellable(v.stock, p.madeToOrder),
      /** Most the customer may put in the cart */
      maxQty: sellableQty(v.stock, p.madeToOrder),
    })),
  };
}

type OrderWithItems = Order & { items: OrderItem[]; payment?: Payment | null };

export function serializeOrder(o: OrderWithItems, origin: string) {
  return {
    orderNumber: o.orderNumber,
    status: o.status,
    statusLabel: ORDER_STATUS_LABELS[o.status as OrderStatus] ?? o.status,
    preorder: o.preorder,
    placedAt: o.createdAt.toISOString(),
    subtotal: o.subtotal,
    discount: o.discount + o.manualDiscount,
    couponCode: o.couponCode,
    shippingFee: o.shippingFee,
    total: o.total,
    notes: o.notes,
    address: {
      name: o.shipName,
      phone: o.shipPhone,
      line1: o.shipLine1,
      line2: o.shipLine2,
      city: o.shipCity,
      state: o.shipState,
      pincode: o.shipPincode,
    },
    items: o.items.map((i) => ({
      productName: i.productName,
      variantLabel: i.variantLabel,
      image: absoluteUrl(i.image, origin),
      price: i.price,
      qty: i.qty,
      isFreebie: i.isFreebie,
    })),
    paymentStatus:
      o.payment?.status === "CAPTURED" ? "PAID" : o.payment?.status === "FAILED" ? "FAILED" : "PENDING",
  };
}
