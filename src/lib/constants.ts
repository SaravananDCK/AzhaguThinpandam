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
  PENDING: ["CANCELLED"],
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

// Setting keys (values stored as strings in the Setting table)
export const SETTINGS = {
  STORE_NAME: "store_name",
  STORE_PHONE: "store_phone",
  STORE_EMAIL: "store_email",
  STORE_ADDRESS: "store_address",
  SHIPPING_FEE: "shipping_fee_paise",
  FREE_SHIPPING_ABOVE: "free_shipping_above_paise",
  LOW_STOCK_THRESHOLD: "low_stock_threshold",
  BOX_TIERS: "box_discount_tiers",
} as const;

export const DEFAULT_SETTINGS: Record<string, string> = {
  [SETTINGS.STORE_NAME]: "AzhaguThinpandam",
  [SETTINGS.STORE_PHONE]: "94435 53634",
  [SETTINGS.STORE_EMAIL]: "",
  [SETTINGS.STORE_ADDRESS]: "Kovilpatti, Tamil Nadu",
  [SETTINGS.SHIPPING_FEE]: "6000", // ₹60
  [SETTINGS.FREE_SHIPPING_ABOVE]: "99900", // free shipping above ₹999
  [SETTINGS.LOW_STOCK_THRESHOLD]: "5",
  // "packs:percent" pairs — discount on the whole order once the cart holds
  // that many packs. Applied server-side at checkout.
  [SETTINGS.BOX_TIERS]: "3:10,4:15,6:20",
};
