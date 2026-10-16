import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/queries";
import { SETTINGS } from "@/lib/constants";
import { buildInvoicePdf } from "@/lib/invoice-pdf";
import { logError } from "@/lib/log";

// The customer's invoice as a PDF, linked from the WhatsApp "paid" message
// ({invoice}) and the order page. Guarded only by the unguessable order number,
// like the order page itself — so it's kept out of search engines too.
export async function GET(_req: Request, { params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  const [order, settings] = await Promise.all([
    prisma.order.findUnique({
      where: { orderNumber: orderNumber.toUpperCase() },
      include: { items: true, payment: true },
    }),
    getSettings(),
  ]);
  if (!order) return new NextResponse("Not found", { status: 404 });

  try {
    const pdf = await buildInvoicePdf(order, {
      name: settings[SETTINGS.STORE_NAME] ?? "",
      address: settings[SETTINGS.STORE_ADDRESS] ?? "",
      phone: settings[SETTINGS.STORE_PHONE] ?? "",
      email: settings[SETTINGS.STORE_EMAIL] ?? "",
    });
    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="Invoice-${order.orderNumber}.pdf"`,
        // Status and payment can change after the link is shared
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  } catch (e) {
    logError("invoice", "Invoice PDF failed", e, { extra: { orderNumber: order.orderNumber } });
    return new NextResponse("Could not build the invoice", { status: 500 });
  }
}
