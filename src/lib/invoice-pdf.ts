// Customer invoice as a real PDF — the same content as the admin "Print A4"
// page, built with pdf-lib so it works in the standalone Docker server with no
// browser. Fonts are Noto Sans (public/fonts) so the ₹ sign renders; the
// built-in PDF fonts don't have it.
import fs from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { Prisma } from "@prisma/client";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/constants";
import { formatDateLong } from "@/lib/dates";
import { gstFromInclusive } from "@/lib/finance";
import { formatINR } from "@/lib/money";
import { packNote } from "@/lib/pack";

export type InvoiceOrder = Prisma.OrderGetPayload<{ include: { items: true; payment: true } }>;
export type InvoiceStore = { name: string; address: string; phone: string; email: string };

const PAGE = { w: 595.28, h: 841.89 }; // A4, points
const MARGIN = 48;
const INK = rgb(0.1, 0.1, 0.1);
const MUTED = rgb(0.42, 0.42, 0.42);
const RULE = rgb(0.85, 0.85, 0.85);

let fontBytes: Promise<[Uint8Array, Uint8Array]> | null = null;
function loadFonts() {
  fontBytes ??= Promise.all(
    ["NotoSans-Regular.ttf", "NotoSans-Bold.ttf"].map((f) =>
      fs.readFile(path.join(process.cwd(), "public", "fonts", f)).then((b) => new Uint8Array(b))
    )
  ) as Promise<[Uint8Array, Uint8Array]>;
  return fontBytes;
}

/** Page writer with a top-down cursor that starts a new page when it runs out. */
class Writer {
  page!: PDFPage;
  y = 0;
  constructor(
    readonly doc: PDFDocument,
    readonly regular: PDFFont,
    readonly bold: PDFFont,
    readonly charset: Set<number>
  ) {
    this.newPage();
  }
  newPage() {
    this.page = this.doc.addPage([PAGE.w, PAGE.h]);
    this.y = PAGE.h - MARGIN;
  }
  ensure(height: number) {
    if (this.y - height < MARGIN) this.newPage();
  }
  /** Drop characters the font can't draw (e.g. Tamil script) rather than print boxes */
  clean(s: string): string {
    let out = "";
    for (const ch of s) {
      const cp = ch.codePointAt(0)!;
      out += this.charset.has(cp) || /\s/.test(ch) ? ch : "";
    }
    return out.replace(/\s{2,}/g, " ").trim() || "—";
  }
  money(paise: number): string {
    const s = formatINR(paise);
    return this.charset.has(0x20b9) ? s : s.replace("₹", "Rs. ");
  }
  width(text: string, size: number, bold = false) {
    return (bold ? this.bold : this.regular).widthOfTextAtSize(text, size);
  }
  wrap(text: string, size: number, maxWidth: number, bold = false): string[] {
    const lines: string[] = [];
    for (const para of this.clean(text).split(/\r?\n/)) {
      let line = "";
      for (const word of para.split(/\s+/).filter(Boolean)) {
        const next = line ? `${line} ${word}` : word;
        if (this.width(next, size, bold) <= maxWidth) line = next;
        else {
          if (line) lines.push(line);
          line = word;
        }
      }
      lines.push(line);
    }
    return lines;
  }
  /** Draw one line at the cursor without moving it. align: left (x), right (x is the right edge), center (x is the middle) */
  text(
    text: string,
    x: number,
    opts: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; align?: "left" | "right" | "center"; y?: number } = {}
  ) {
    const { size = 10, bold = false, color = INK, align = "left" } = opts;
    const t = this.clean(text);
    const w = this.width(t, size, bold);
    const px = align === "right" ? x - w : align === "center" ? x - w / 2 : x;
    this.page.drawText(t, { x: px, y: opts.y ?? this.y, size, font: bold ? this.bold : this.regular, color });
  }
  /** Draw a wrapped paragraph and move the cursor below it; returns the height used */
  paragraph(text: string, x: number, maxWidth: number, opts: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; lead?: number } = {}) {
    const { size = 10, lead = size * 1.35 } = opts;
    const lines = this.wrap(text, size, maxWidth, opts.bold);
    for (const line of lines) {
      this.ensure(lead);
      this.y -= lead;
      this.text(line, x, { ...opts, size });
    }
    return lines.length * lead;
  }
  rule(y = this.y, color = RULE) {
    this.page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE.w - MARGIN, y }, thickness: 0.6, color });
  }
  gap(h: number) {
    this.y -= h;
  }
}

export async function buildInvoicePdf(order: InvoiceOrder, store: InvoiceStore): Promise<Uint8Array> {
  const [regularBytes, boldBytes] = await loadFonts();
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const regular = await doc.embedFont(regularBytes, { subset: true });
  const bold = await doc.embedFont(boldBytes, { subset: true });
  doc.setTitle(`Invoice ${order.orderNumber}`);
  doc.setAuthor(store.name);
  doc.setCreationDate(order.createdAt);

  const w = new Writer(doc, regular, bold, new Set(regular.getCharacterSet()));
  const right = PAGE.w - MARGIN;
  const colW = PAGE.w - MARGIN * 2;

  // Header: store on the left, invoice number on the right
  const top = w.y;
  w.y -= 18;
  w.text(store.name, MARGIN, { size: 18, bold: true });
  w.y -= 6;
  w.paragraph(store.address, MARGIN, colW * 0.55, { size: 8.5, color: MUTED });
  w.paragraph([store.phone, store.email].filter(Boolean).join(" · "), MARGIN, colW * 0.55, { size: 8.5, color: MUTED });
  const leftBottom = w.y;
  w.text("Invoice", right, { size: 14, bold: true, align: "right", y: top - 16 });
  w.text(order.orderNumber, right, { size: 11, align: "right", y: top - 32 });
  w.text(formatDateLong(order.createdAt), right, { size: 8.5, color: MUTED, align: "right", y: top - 46 });
  w.text(ORDER_STATUS_LABELS[order.status as OrderStatus] ?? order.status, right, { size: 8.5, color: MUTED, align: "right", y: top - 58 });
  w.y = Math.min(leftBottom, top - 64) - 12;
  w.rule();
  w.gap(16);

  // Deliver to / payment
  const sectionTop = w.y;
  w.text("DELIVER TO", MARGIN, { size: 7.5, bold: true, color: MUTED });
  w.gap(4);
  w.paragraph(order.shipName, MARGIN, colW * 0.5, { size: 10, bold: true });
  w.paragraph(
    [order.shipLine1, order.shipLine2, `${order.shipCity}, ${order.shipState} — ${order.shipPincode}`].filter(Boolean).join("\n"),
    MARGIN,
    colW * 0.5,
    { size: 9.5 }
  );
  w.paragraph([order.shipPhone, order.email].filter(Boolean).join("\n"), MARGIN, colW * 0.5, { size: 9.5 });
  const leftEnd = w.y;
  w.y = sectionTop;
  const midX = MARGIN + colW * 0.58;
  w.text("PAYMENT", midX, { size: 7.5, bold: true, color: MUTED });
  w.gap(4);
  const paid = order.payment?.status === "CAPTURED";
  w.paragraph(paid ? "Paid" : "Payment pending", midX, colW * 0.42, { size: 10, bold: true });
  if (order.payment?.method) w.paragraph(`Method: ${order.payment.method}`, midX, colW * 0.42, { size: 9.5 });
  if (order.payment?.razorpayPaymentId) w.paragraph(`Ref: ${order.payment.razorpayPaymentId}`, midX, colW * 0.42, { size: 8, color: MUTED });
  if (order.preorder) w.paragraph("Pre-order", midX, colW * 0.42, { size: 9.5, bold: true });
  w.y = Math.min(leftEnd, w.y) - 12;
  w.rule();
  w.gap(14);

  // Items table
  const col = { item: MARGIN, qty: MARGIN + colW * 0.66, rate: MARGIN + colW * 0.82, amount: right };
  const itemW = colW * 0.6;
  const header = () => {
    w.ensure(30);
    w.text("ITEM", col.item, { size: 7.5, bold: true, color: MUTED });
    w.text("QTY", col.qty, { size: 7.5, bold: true, color: MUTED, align: "center" });
    w.text("RATE", col.rate, { size: 7.5, bold: true, color: MUTED, align: "right" });
    w.text("AMOUNT", col.amount, { size: 7.5, bold: true, color: MUTED, align: "right" });
    w.gap(6);
    w.rule();
    w.gap(12);
  };
  header();
  for (const item of order.items) {
    const note = packNote(item.variantLabel, item.basePackGrams ?? undefined);
    const nameLines = w.wrap(item.productName, 10, itemW, true);
    const sub = `${item.variantLabel}${note ? ` · ${note}` : ""}`;
    const subLines = w.wrap(sub, 8.5, itemW);
    const rowH = nameLines.length * 13 + subLines.length * 11 + 8;
    if (w.y - rowH < MARGIN) {
      w.newPage();
      header();
    }
    const rowTop = w.y;
    for (const l of nameLines) {
      w.text(l, col.item, { size: 10, bold: true });
      w.y -= 13;
    }
    for (const l of subLines) {
      w.text(l, col.item, { size: 8.5, color: MUTED });
      w.y -= 11;
    }
    w.text(String(item.qty), col.qty, { size: 10, align: "center", y: rowTop });
    w.text(item.isFreebie ? "FREE" : w.money(item.price), col.rate, { size: 10, align: "right", y: rowTop });
    w.text(item.isFreebie ? "FREE" : w.money(item.price * item.qty), col.amount, { size: 10, align: "right", y: rowTop });
    w.y -= 2;
    w.rule(w.y + 2, rgb(0.93, 0.93, 0.93));
    w.y -= 6;
  }

  // Totals, right-aligned block
  w.gap(6);
  const labelX = MARGIN + colW * 0.6;
  const line = (label: string, value: string, opts: { bold?: boolean; size?: number } = {}) => {
    w.ensure(16);
    w.y -= 14;
    w.text(label, labelX, { size: opts.size ?? 10, color: opts.bold ? INK : MUTED, bold: opts.bold });
    w.text(value, right, { size: opts.size ?? 10, align: "right", bold: opts.bold });
  };
  line("Subtotal", w.money(order.subtotal));
  if (order.discount > 0) line(order.couponCode ? `Coupon (${order.couponCode})` : "Bundle discount", `−${w.money(order.discount)}`);
  if (order.manualDiscount > 0) line("Discount", `−${w.money(order.manualDiscount)}`);
  line("Shipping", order.shippingFee === 0 ? "FREE" : w.money(order.shippingFee));
  w.gap(4);
  w.page.drawLine({ start: { x: labelX, y: w.y }, end: { x: right, y: w.y }, thickness: 0.6, color: RULE });
  line("Total", w.money(order.total), { bold: true, size: 12 });

  // GST summary — prices are inclusive
  const gstByRate = new Map<number, { taxable: number; gst: number }>();
  for (const item of order.items) {
    const rate = item.gstRate ?? 0;
    if (!rate) continue;
    const gross = item.price * item.qty;
    const gst = gstFromInclusive(gross, rate);
    const e = gstByRate.get(rate) ?? { taxable: 0, gst: 0 };
    e.taxable += gross - gst;
    e.gst += gst;
    gstByRate.set(rate, e);
  }
  if (gstByRate.size) {
    w.gap(22);
    w.ensure(40 + gstByRate.size * 13);
    w.rule();
    w.gap(14);
    w.text("GST SUMMARY (PRICES ARE GST-INCLUSIVE)", MARGIN, { size: 7.5, bold: true, color: MUTED });
    w.gap(14);
    const gx = { rate: MARGIN, taxable: MARGIN + 150, gst: MARGIN + 250 };
    w.text("Rate", gx.rate, { size: 8, color: MUTED });
    w.text("Taxable", gx.taxable, { size: 8, color: MUTED, align: "right" });
    w.text("GST", gx.gst, { size: 8, color: MUTED, align: "right" });
    for (const [rate, e] of [...gstByRate.entries()].sort((a, b) => a[0] - b[0])) {
      w.y -= 13;
      w.text(`${rate}%`, gx.rate, { size: 9 });
      w.text(w.money(e.taxable), gx.taxable, { size: 9, align: "right" });
      w.text(w.money(e.gst), gx.gst, { size: 9, align: "right" });
    }
  }

  if (order.notes) {
    w.gap(20);
    w.ensure(30);
    w.rule();
    w.gap(4);
    w.paragraph(`Note: ${order.notes}`, MARGIN, colW, { size: 8.5, color: MUTED });
  }

  w.gap(28);
  w.ensure(14);
  w.text(`Thank you for your order! · ${store.name}`, PAGE.w / 2, { size: 8.5, color: MUTED, align: "center" });

  return doc.save();
}
