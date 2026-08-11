import nodemailer from "nodemailer";
import type { Order, OrderItem } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatINR } from "@/lib/money";
import { packNote } from "@/lib/pack";
import { ORDER_STATUS_LABELS, SETTINGS, type OrderStatus } from "@/lib/constants";
import { getSettings } from "@/lib/queries";

export function isSmtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);
}

function getTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT ?? "587", 10),
    secure: process.env.SMTP_PORT === "465",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

/**
 * Sender for customer mail: the store's own contact address, so order updates
 * come from somewhere customers recognise and can reply to.
 *
 * Reads Admin → Settings first (changeable without a redeploy), falling back to
 * SMTP_FROM and then the SMTP login. Note that most providers require the From
 * address to belong to the authenticated mailbox or domain — if the store email
 * is changed to something the SMTP account can't send as, delivery will fail or
 * land in spam.
 */
export async function fromAddress(): Promise<{ from: string; replyTo?: string }> {
  const settings = await getSettings();
  const storeEmail = (settings[SETTINGS.STORE_EMAIL] ?? "").trim();
  const storeName = (settings[SETTINGS.STORE_NAME] ?? "").trim();
  if (storeEmail) {
    return {
      from: storeName ? `"${storeName}" <${storeEmail}>` : storeEmail,
      replyTo: storeEmail,
    };
  }
  return { from: process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "" };
}

async function sendMail(to: string, subject: string, html: string) {
  if (!isSmtpConfigured()) {
    console.log(`[email:dev] To: ${to} | ${subject}`);
    return;
  }
  const { from, replyTo } = await fromAddress();
  await getTransport().sendMail({
    from,
    ...(replyTo ? { replyTo } : {}),
    to,
    subject,
    html,
  });
}

/**
 * Login OTP email — the email twin of the WhatsApp code. Sends directly (not
 * via sendMail, which silently no-ops without SMTP) and throws on transport
 * failure so /api/otp/request can answer 502 instead of pretending it sent.
 */
export async function sendOtpEmail(email: string, code: string): Promise<void> {
  const { from, replyTo } = await fromAddress();
  await getTransport().sendMail({
    from,
    ...(replyTo ? { replyTo } : {}),
    to: email,
    subject: "Your Azhagu Thinpandam login code",
    html: wrap(`
      <p>Your one-time login code is:</p>
      <p style="font-size:32px;font-weight:bold;letter-spacing:8px;margin:16px 0">${code}</p>
      <p style="font-size:13px;color:#78716c">It expires in 5 minutes. If you didn't request this, you can ignore this email.</p>`),
  });
}

function orderItemsTable(items: OrderItem[], order: Order) {
  const rows = items
    .map((i) => {
      const note = packNote(i.variantLabel, i.basePackGrams ?? undefined);
      const amount = i.isFreebie
        ? `<span style="color:#15803d;font-weight:bold">FREE</span>`
        : formatINR(i.price * i.qty);
      return `<tr><td style="padding:6px 12px 6px 0">${i.isFreebie ? "🎁 " : ""}${i.productName} (${i.variantLabel}${note ? `, ${note}` : ""}) × ${i.qty}</td><td style="padding:6px 0;text-align:right">${amount}</td></tr>`;
    })
    .join("");
  const discountRow =
    order.discount > 0
      ? `<tr><td style="padding:6px 12px 6px 0;border-top:1px solid #ddd">${order.couponCode ? `Coupon (${order.couponCode})` : "Bundle discount"}</td><td style="padding:6px 0;text-align:right;border-top:1px solid #ddd;color:#15803d">−${formatINR(order.discount)}</td></tr>`
      : "";
  return `<table style="width:100%;border-collapse:collapse;font-size:14px">${rows}
    ${discountRow}
    <tr><td style="padding:6px 12px 6px 0;border-top:1px solid #ddd">Shipping</td><td style="padding:6px 0;text-align:right;border-top:1px solid #ddd">${order.shippingFee === 0 ? "FREE" : formatINR(order.shippingFee)}</td></tr>
    <tr><td style="padding:6px 12px 6px 0;font-weight:bold">Total</td><td style="padding:6px 0;text-align:right;font-weight:bold">${formatINR(order.total)}</td></tr>
  </table>`;
}

function wrap(content: string) {
  return `<div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:24px;color:#292524">
    <h2 style="color:#8f1e1e;margin:0 0 4px">Azhagu Thinpandam</h2>
    <p style="margin:0 0 20px;font-size:13px;color:#78716c">அழகு திண்பண்டம் — Traditional Tamil Snacks</p>
    ${content}
    <p style="margin-top:28px;font-size:12px;color:#78716c">Questions? Just reply to this email.</p>
  </div>`;
}

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function sendOrderConfirmationEmail(orderNumber: string) {
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: { items: true },
  });
  if (!order) return;
  // Admin-entered WhatsApp orders may have no email — nothing to send to.
  if (!order.email) return;

  const trackUrl = `${appUrl()}/order/${order.orderNumber}`;
  await sendMail(
    order.email,
    `Order confirmed — ${order.orderNumber}`,
    wrap(`
      <p>Vanakkam ${order.shipName},</p>
      <p>Thank you for your order! We've received your payment and will start preparing your snacks fresh.</p>
      <p style="font-size:15px"><strong>Order ${order.orderNumber}</strong></p>
      ${orderItemsTable(order.items, order)}
      <p style="margin-top:20px"><a href="${trackUrl}" style="background:#8f1e1e;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Track your order</a></p>
    `)
  );

  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail) {
    await sendMail(
      adminEmail,
      `New order ${order.orderNumber} — ${formatINR(order.total)}`,
      wrap(`
        <p><strong>New order received.</strong></p>
        <p>${order.shipName} · ${order.shipPhone} · ${order.email}</p>
        <p>${order.shipLine1}${order.shipLine2 ? ", " + order.shipLine2 : ""}, ${order.shipCity}, ${order.shipState} — ${order.shipPincode}</p>
        ${orderItemsTable(order.items, order)}
        <p style="margin-top:20px"><a href="${appUrl()}/admin/orders">Open admin panel</a></p>
      `)
    );
  }
}

export async function sendOrderStatusEmail(orderNumber: string, status: OrderStatus) {
  // Only statuses customers care about
  if (!["CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"].includes(status)) return;

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: { items: true },
  });
  if (!order) return;
  if (!order.email) return; // admin-entered order without an email address

  const messages: Partial<Record<OrderStatus, string>> = {
    CONFIRMED: "Your order is confirmed and being prepared fresh.",
    SHIPPED: "Your order is on its way!",
    DELIVERED: "Your order has been delivered. Enjoy the snacks!",
    CANCELLED:
      "Your order has been cancelled. If you were charged, the refund will reach you in 5–7 business days.",
  };

  await sendMail(
    order.email,
    `Order ${order.orderNumber}: ${ORDER_STATUS_LABELS[status]}`,
    wrap(`
      <p>Vanakkam ${order.shipName},</p>
      <p>${messages[status]}</p>
      <p><a href="${appUrl()}/order/${order.orderNumber}">View order ${order.orderNumber}</a></p>
    `)
  );
}
