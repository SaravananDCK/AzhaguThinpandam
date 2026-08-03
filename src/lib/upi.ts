// Links for the manual UPI settlement flow used until the payment gateway is
// live: a UPI deep link that opens the customer's payment app with the amount
// prefilled, and a WhatsApp link so they can send us the screenshot.

/** "93440 22162" / "+91 93440 22162" → "919344022162" (wa.me format). */
export function whatsappNumber(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10 && /^[6-9]/.test(digits)) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  return null;
}

/**
 * UPI deep link (`upi://pay?...`). Opens GPay/PhonePe/Paytm with the payee and
 * amount filled in. Amount goes in rupees with two decimals, per the spec.
 */
export function upiPayLink(params: {
  upiId: string;
  payeeName: string;
  amountPaise: number;
  orderNumber: string;
}): string | null {
  const pa = params.upiId.trim();
  // A VPA looks like name@bank — don't build a link from a half-filled setting
  if (!/^[\w.\-]{2,}@[\w.\-]{2,}$/.test(pa)) return null;
  const q = new URLSearchParams({
    pa,
    pn: params.payeeName || "Store",
    am: (params.amountPaise / 100).toFixed(2),
    cu: "INR",
    tn: `Order ${params.orderNumber}`,
  });
  // URLSearchParams encodes spaces as "+", which several UPI apps show
  // literally ("Azhagu+Thinpandam"). %20 is understood everywhere.
  return `upi://pay?${q.toString().replace(/\+/g, "%20")}`;
}

/**
 * QR for a UPI link, as an inline SVG string. Generated per order so the
 * amount and order number are encoded — the customer scans and pays the exact
 * sum instead of typing it, which is where wrong payments come from. Inline
 * (not an <img>) so it costs no extra request on a slow connection.
 */
export async function upiQrSvg(link: string): Promise<string | null> {
  try {
    const QRCode = (await import("qrcode")).default;
    return await QRCode.toString(link, {
      type: "svg",
      margin: 1,
      width: 220,
      errorCorrectionLevel: "M",
    });
  } catch {
    return null; // a missing QR must never break the order page
  }
}

/** wa.me link with the order details prefilled for the customer to send. */
export function whatsappOrderLink(params: {
  phone: string;
  orderNumber: string;
  amountRupees: string;
}): string | null {
  const to = whatsappNumber(params.phone);
  if (!to) return null;
  const text = `Hi! I've placed order ${params.orderNumber} for ₹${params.amountRupees}. Here is my UPI payment screenshot.`;
  return `https://wa.me/${to}?text=${encodeURIComponent(text)}`;
}
