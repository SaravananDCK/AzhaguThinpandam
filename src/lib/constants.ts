// Product lines. Snacks are priced, discounted and shipped by weight;
// merchandise isn't, and is listed in its own storefront section.
export const PRODUCT_LINES = ["SNACKS", "MAGNETS"] as const;
export type ProductLine = (typeof PRODUCT_LINES)[number];

export const PRODUCT_LINE_LABELS: Record<ProductLine, string> = {
  SNACKS: "Snacks",
  MAGNETS: "Magnets",
};

/** Lines that count toward the build-your-box weight discount. */
export const WEIGHT_DISCOUNT_LINES: ProductLine[] = ["SNACKS"];

// What the customer earns when the cart crosses a weight tier: a percent off
// the snack subtotal, or free products ("goodies"). SQLite has no enums —
// stored as a validated string setting.
export const DISCOUNT_TYPES = ["percent", "goodies"] as const;
export type DiscountType = (typeof DISCOUNT_TYPES)[number];

export const ORDER_STATUSES = [
  "PENDING",
  "PAID",
  "CONFIRMED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "Payment pending",
  PAID: "Paid",
  CONFIRMED: "Confirmed",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

// Statuses an admin can move an order to, from each status
export const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  // PENDING → PAID is the manual UPI confirmation: the admin checks the
  // transfer landed, then marks it paid (which decrements stock, records any
  // coupon redemption and sends the confirmation email).
  PENDING: ["PAID", "CANCELLED"],
  PAID: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

export const ROLES = { CUSTOMER: "CUSTOMER", ADMIN: "ADMIN" } as const;
export type Role = keyof typeof ROLES;

export const PAYMENT_STATUSES = {
  CREATED: "CREATED",
  CAPTURED: "CAPTURED",
  FAILED: "FAILED",
} as const;

export const REVIEW_STATUSES = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;
export type ReviewStatus = keyof typeof REVIEW_STATUSES;

// Orders that count as a completed purchase (gates who may review)
export const PURCHASED_STATUSES = ["PAID", "CONFIRMED", "SHIPPED", "DELIVERED"] as const;

// Setting keys (values stored as strings in the Setting table)
export const SETTINGS = {
  STORE_NAME: "store_name",
  STORE_PHONE: "store_phone",
  STORE_EMAIL: "store_email",
  STORE_ADDRESS: "store_address",
  SHIPPING_FEE: "shipping_fee_paise", // inside Tamil Nadu, flat
  FREE_SHIPPING_ABOVE: "free_shipping_above_paise", // inside Tamil Nadu threshold
  OUTSIDE_TN_PER_KG: "outside_tn_shipping_per_kg_paise", // per kg, always charged
  LOW_STOCK_THRESHOLD: "low_stock_threshold",
  BOX_TIERS: "box_discount_tiers",
  DISCOUNT_TYPE: "discount_type", // "percent" | "goodies" (DISCOUNT_TYPES)
  GOODIE_TIERS: "goodie_tiers", // JSON: [{"kg":2,"variantId":"…","qty":1},…]
  PACKING_COST: "packing_cost_paise",
  ROUND_TO_FIVE: "round_prices_to_five",
  INSTAGRAM_HANDLE: "instagram_handle",
  INSTAGRAM_REELS: "instagram_reels",
  GA_MEASUREMENT_ID: "ga_measurement_id",
  PRE_LAUNCH_NOTICE: "pre_launch_notice",
  DEFAULT_GST_RATE: "default_gst_rate",
  // "1" = take orders but settle payment manually over UPI/WhatsApp instead of
  // opening the payment gateway. For use until the gateway goes live.
  MANUAL_UPI_PAYMENT: "manual_upi_payment",
  UPI_ID: "upi_id",
} as const;

// Ways a supplier payment can be made (stored as a plain string)
export const SUPPLIER_PAYMENT_METHODS = [
  "Cash",
  "UPI",
  "Bank transfer",
  "Cheque",
  "Other",
] as const;

// Whether a wholesale purchase (supplier invoice) has been settled. A marker on
// the invoice — the supplier balance itself is derived from SupplierPayment rows.
export const PURCHASE_STATUSES = ["UNPAID", "PAID"] as const;
export type PurchaseStatus = (typeof PURCHASE_STATUSES)[number];
export const PURCHASE_STATUS_LABELS: Record<PurchaseStatus, string> = {
  UNPAID: "Unpaid",
  PAID: "Paid",
};

export const DEFAULT_SETTINGS: Record<string, string> = {
  [SETTINGS.STORE_NAME]: "Azhagu Thinpandam",
  [SETTINGS.STORE_PHONE]: "93440 22162",
  [SETTINGS.STORE_EMAIL]: "",
  [SETTINGS.STORE_ADDRESS]: "Kovilpatti, Tamil Nadu",
  [SETTINGS.SHIPPING_FEE]: "6000", // ₹60 flat, inside Tamil Nadu
  [SETTINGS.FREE_SHIPPING_ABOVE]: "99900", // free inside TN above ₹999
  // Outside Tamil Nadu: charged by weight (rounded up to the next kg), always —
  // no free shipping. ₹70/kg default.
  [SETTINGS.OUTSIDE_TN_PER_KG]: "7000",
  [SETTINGS.LOW_STOCK_THRESHOLD]: "5",
  // "kg:percent" pairs — discount on the whole order once the cart's total
  // weight reaches that many kilograms. Applied server-side at checkout.
  [SETTINGS.BOX_TIERS]: "1:3,3:5,4:7,6:10",
  // Which weight-tier reward is live: "percent" uses BOX_TIERS, "goodies" adds
  // the GOODIE_TIERS items free of charge.
  [SETTINGS.DISCOUNT_TYPE]: "percent",
  // Goodie tiers as JSON rows. Several rows may share a kg threshold (the tier
  // then gives all of them). Only the highest reached tier applies.
  [SETTINGS.GOODIE_TIERS]: "[]",
  // Internal packing cost recorded on each new order (₹, for P&L only)
  [SETTINGS.PACKING_COST]: "0",
  // "1" = computed sale prices ceil to the next ₹5; "0" = exact to the ₹1
  [SETTINGS.ROUND_TO_FIVE]: "1",
  // Instagram handle (no @) for the homepage "Follow" link + section heading
  [SETTINGS.INSTAGRAM_HANDLE]: "azhagintamilmozhi05",
  // Reel/post URLs to feature on the homepage — one per line (or comma-separated)
  [SETTINGS.INSTAGRAM_REELS]: "",
  // Google Analytics 4 measurement id ("G-…"). Loaded on customer-facing pages
  // only (never admin), and only in production. Empty disables the tag.
  [SETTINGS.GA_MEASUREMENT_ID]: "G-2DJHGX2CKR",
  // Shown as a banner on the cart/checkout while manual UPI payment is on.
  // Orders are still placed — only the gateway step is replaced.
  [SETTINGS.PRE_LAUNCH_NOTICE]:
    "We're taking orders ahead of our grand inauguration! 🎉 Card payments go live shortly — until then, pay by UPI and send us the screenshot on WhatsApp.",
  // Manual UPI settlement until the payment gateway is live. Turn off ("0")
  // once the gateway is configured and checkout should open it instead.
  [SETTINGS.MANUAL_UPI_PAYMENT]: "1",
  // UPI ID (VPA) customers pay to, e.g. "azhagu@okicici". Empty falls back to
  // "we'll message you the payment details on WhatsApp".
  [SETTINGS.UPI_ID]: "",
  // Default GST% (used for products with no per-product rate, and as the
  // starting value on the purchase form). Prices are treated as GST-inclusive.
  [SETTINGS.DEFAULT_GST_RATE]: "5",
};

// Suggested expense categories for the accounting module
export const EXPENSE_CATEGORIES = [
  "Packing Materials",
  "Transport & Courier",
  "Marketing",
  "Utilities",
  "Salaries",
  "Platform & Software",
  "Other",
] as const;
