import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/queries";
import { SETTINGS } from "@/lib/constants";

/**
 * Meta Conversions API — the server-side half of the pixel.
 *
 * The browser `Purchase` in src/components/store/purchase-pixel.tsx is lost to
 * ad blockers, iOS tracking limits, and customers who simply never reopen the
 * order page. This sends the same event from the server, where none of that
 * applies. Meta collapses the pair on `event_id` (the order number, sent by
 * both) so the sale is only ever counted once.
 *
 * The access token is a credential, so it lives in the environment alongside
 * the Razorpay and Twilio keys — never in the Setting table, which is
 * admin-editable and included in database backups. The dataset id is the same
 * `meta_pixel_id` setting the browser pixel uses.
 */

// Pinned rather than "latest": Meta expires a version roughly two years after
// release, and an unpinned call would change behaviour under us. v24.0 runs to
// February 2028. Bump it with META_GRAPH_API_VERSION when that gets close.
const DEFAULT_API_VERSION = "v24.0";

/** SHA-256 hex, as Meta requires for every personal identifier. */
function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Hashes a value only if it survives normalising — Meta rejects empty hashes. */
function hashed(value: string | null | undefined): string | undefined {
  const clean = (value ?? "").trim().toLowerCase();
  return clean ? hash(clean) : undefined;
}

/**
 * An Indian mobile in the form Meta matches on: country code, digits only, no
 * plus. Numbers are stored as the bare 10 digits (see src/lib/whatsapp.ts,
 * which prefixes 91 the same way), but a customer may have typed a 0 or a
 * +91 into the delivery field.
 */
function hashedPhone(value: string | null | undefined): string | undefined {
  let digits = (value ?? "").replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length === 10) digits = `91${digits}`;
  return digits.length >= 11 ? hash(digits) : undefined;
}

/** City/state/country codes go over lowercased with spaces and punctuation out. */
function hashedPlace(value: string | null | undefined): string | undefined {
  const clean = (value ?? "").toLowerCase().replace(/[^a-z]/g, "");
  return clean ? hash(clean) : undefined;
}

type CapiConfig = {
  datasetId: string;
  accessToken: string;
  apiVersion: string;
  testEventCode?: string;
};

/**
 * Resolves the config, or null when the event should not be sent at all.
 *
 * Mirrors the browser pixel's production gate so local orders never reach the
 * real dataset — with one exception: a test event code means the developer is
 * deliberately aiming at Events Manager's Test Events tab, which is discarded
 * from reporting anyway.
 */
async function capiConfig(): Promise<CapiConfig | null> {
  const accessToken = (process.env.META_CAPI_ACCESS_TOKEN ?? "").trim();
  if (!accessToken) return null;

  const testEventCode = (process.env.META_CAPI_TEST_EVENT_CODE ?? "").trim();
  if (process.env.NODE_ENV !== "production" && !testEventCode) return null;

  const settings = await getSettings();
  const datasetId = (settings[SETTINGS.META_PIXEL_ID] ?? "").trim();
  if (!datasetId) return null;

  return {
    datasetId,
    accessToken,
    apiVersion: (process.env.META_GRAPH_API_VERSION ?? "").trim() || DEFAULT_API_VERSION,
    testEventCode: testEventCode || undefined,
  };
}

/**
 * Sends the server-side `Purchase` for an order that has just been paid.
 *
 * Call it fire-and-forget: Meta being slow or down must never fail a payment.
 * Everything it needs is read fresh from the order, including the browser
 * context captured at checkout — the request that confirms a payment belongs
 * to Razorpay or to an admin, and taking the user agent or `_fbp` off *that*
 * would attribute the customer's purchase to the wrong person.
 */
export async function sendPurchaseEvent(orderNumber: string): Promise<void> {
  const config = await capiConfig();
  if (!config) return;

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: {
      items: true,
      user: { select: { id: true, phone: true, email: true } },
    },
  });
  if (!order) return;

  // Same shape the order page sends from the browser, so the two events agree
  // on what was bought. A deleted product nulls the snapshotted variant, so
  // fall back to the item row's own id.
  const contents = order.items.map((i) => ({
    id: i.variantId ?? i.id,
    quantity: i.qty,
    item_price: i.price / 100,
  }));

  // Meta matches on any identifier that lands, so send every one we hold. The
  // delivery phone can differ from the account's (a gift sent to a relative) —
  // both are legitimate, and the array lets Meta try each.
  const phones = [
    hashedPhone(order.user?.phone),
    hashedPhone(order.shipPhone),
  ].filter((p): p is string => Boolean(p));

  const [firstName, ...restName] = order.shipName.trim().split(/\s+/);

  const userData: Record<string, unknown> = {
    em: hashed(order.email || order.user?.email),
    ph: phones.length ? [...new Set(phones)] : undefined,
    fn: hashed(firstName),
    ln: restName.length ? hashed(restName.join(" ")) : undefined,
    ct: hashedPlace(order.shipCity),
    st: hashedPlace(order.shipState),
    zp: hashed(order.shipPincode),
    country: hashedPlace("in"),
    external_id: order.user?.id ? hash(order.user.id) : undefined,
    // Not hashed — Meta wants these raw.
    client_ip_address: order.clientIp ?? undefined,
    client_user_agent: order.clientUserAgent ?? undefined,
    fbp: order.fbp ?? undefined,
    fbc: order.fbc ?? undefined,
  };

  // Meta requires client_user_agent on every event declared as "website", and
  // rejects the event without it. An order taken over the phone by an admin
  // never had a browser, and orders placed before this context was captured
  // no longer have one either — those are real sales, so they go over as
  // "other" rather than being dropped or lying about where they happened.
  const fromWebsite = Boolean(order.clientUserAgent);
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const body = {
    data: [
      {
        event_name: "Purchase",
        // Seconds, not milliseconds — Meta rejects the event otherwise.
        event_time: Math.floor(Date.now() / 1000),
        // The order number, matching the browser event's eventID. This is what
        // stops the sale being counted twice.
        event_id: order.orderNumber,
        action_source: fromWebsite ? "website" : "other",
        event_source_url:
          fromWebsite && appUrl ? `${appUrl}/order/${order.orderNumber}` : undefined,
        user_data: Object.fromEntries(
          Object.entries(userData).filter(([, v]) => v !== undefined)
        ),
        custom_data: {
          currency: "INR",
          value: order.total / 100,
          content_type: "product",
          content_ids: contents.map((c) => c.id),
          contents,
          num_items: order.items.reduce((n, i) => n + i.qty, 0),
          order_id: order.orderNumber,
        },
      },
    ],
    ...(config.testEventCode ? { test_event_code: config.testEventCode } : {}),
  };

  const url = `https://graph.facebook.com/${config.apiVersion}/${config.datasetId}/events?access_token=${encodeURIComponent(config.accessToken)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    // A hung request must not keep the payment flow's process work alive.
    signal: AbortSignal.timeout(5000),
  });

  if (!res.ok) {
    // Meta's error body is the only diagnosis available — the status alone
    // never says which field it disliked.
    const detail = await res.text().catch(() => "");
    throw new Error(`Meta CAPI ${res.status}: ${detail.slice(0, 500)}`);
  }
}
