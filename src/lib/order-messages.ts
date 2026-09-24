import { ORDER_STATUSES, type OrderStatus } from "@/lib/constants";
import { whatsappNumber } from "@/lib/upi";

// WhatsApp messages an admin sends to a customer from the Orders screen, one
// template per order status. The button only opens WhatsApp with the text
// filled in — the admin reviews it, attaches a photo (e.g. the courier
// receipt) and presses send, so nothing goes out automatically and no
// WhatsApp Business template approval is involved. Client-safe.

export type OrderMessageTemplates = Record<OrderStatus, string>;

/** Placeholders a template may use, with what they turn into. */
export const ORDER_MESSAGE_PLACEHOLDERS = [
  ["{name}", "customer's name"],
  ["{order}", "order number"],
  ["{total}", "order total, e.g. ₹1,130"],
  ["{packs}", "number of packs"],
  ["{link}", "the customer's order page"],
  ["{review}", "where they rate the order (taste, packing, delivery)"],
  ["{store}", "store name"],
] as const;

export const DEFAULT_ORDER_MESSAGES: OrderMessageTemplates = {
  PENDING:
    "Vanakkam {name}! 🙏 Your {store} order {order} for {total} is waiting for payment. You can complete it here: {link}\nNeed any help? Just reply to this message.",
  PAID: "Vanakkam {name}! 🙏 We have received your payment of {total} for order {order}. We'll start preparing it fresh for you. Thank you for choosing {store}!",
  CONFIRMED:
    "Vanakkam {name}! 🙏 Your {store} order {order} is confirmed and is being prepared fresh. We'll message you as soon as it is dispatched.",
  SHIPPED:
    "Vanakkam {name}! 🙏 Your {store} order {order} ({packs} packs) has been shipped today. 📦 The courier receipt with the tracking number is attached below.\nTrack your order: {link}",
  DELIVERED:
    "Vanakkam {name}! 🙏 Your {store} order {order} shows as delivered. We hope you enjoy every bite! If you have a minute, please tell us how the taste, packing and delivery were — it means a lot to us: {review}",
  CANCELLED:
    "Vanakkam {name}. Your {store} order {order} has been cancelled. If you paid, the refund of {total} will reach you within 7 business days. Sorry for the trouble — reply here if you have any questions.",
};

/** Settings JSON → a full template set; missing or blank entries fall back to the defaults. */
export function parseOrderMessages(raw: string | null | undefined): OrderMessageTemplates {
  let saved: Record<string, unknown> = {};
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (parsed && typeof parsed === "object") saved = parsed as Record<string, unknown>;
  } catch {
    // unreadable setting — use the defaults
  }
  const out = { ...DEFAULT_ORDER_MESSAGES };
  for (const status of ORDER_STATUSES) {
    const v = saved[status];
    if (typeof v === "string" && v.trim()) out[status] = v.trim();
  }
  return out;
}

export type OrderMessageContext = {
  name: string;
  orderNumber: string;
  totalRupees: number;
  packs: number;
  storeName: string;
  /** Site origin without a trailing slash, e.g. https://azhaguthinpandam.com */
  appUrl: string;
};

export function renderOrderMessage(template: string, c: OrderMessageContext): string {
  const values: Record<string, string> = {
    "{name}": c.name.trim().split(/\s+/)[0] || "there",
    "{order}": c.orderNumber,
    "{total}": `₹${c.totalRupees.toLocaleString("en-IN")}`,
    "{packs}": String(c.packs),
    "{link}": `${c.appUrl}/order/${c.orderNumber}`,
    "{review}": `${c.appUrl}/order/${c.orderNumber}#review`,
    "{store}": c.storeName,
  };
  return template.replace(/\{(name|order|total|packs|link|review|store)\}/g, (m) => values[m]);
}

/** wa.me link that opens a chat with the customer, message prefilled. Null when the number isn't an Indian mobile. */
export function orderWhatsAppLink(phone: string, message: string): string | null {
  const to = whatsappNumber(phone);
  return to ? `https://wa.me/${to}?text=${encodeURIComponent(message)}` : null;
}
