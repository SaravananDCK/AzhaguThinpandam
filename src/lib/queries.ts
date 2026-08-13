import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_SETTINGS,
  DISCOUNT_TYPES,
  SETTINGS,
  type DiscountType,
  type ProductLine,
} from "@/lib/constants";
import { parseBoxTiers, parseGoodieTiers, type BoxTier, type GoodieTier } from "@/lib/box";
import { staffUnitPrice } from "@/lib/staff-pricing";
import { getViewerPricing } from "@/lib/viewer";

const productInclude = {
  images: { orderBy: { sortOrder: "asc" as const } },
  variants: {
    where: { isActive: true },
    orderBy: { sortOrder: "asc" as const },
  },
  category: true,
} satisfies Prisma.ProductInclude;

export type ProductWithDetails = Prisma.ProductGetPayload<{
  include: typeof productInclude;
}>;

/**
 * Rewrites variant prices for a staff viewer. Applied here, where storefront
 * product data is loaded, so every surface (cards, product page, related,
 * build-your-box, magnets) is covered by construction rather than by each page
 * remembering to opt in. Admin pages use their own Prisma calls and are
 * unaffected — they keep showing retail.
 *
 * `mrp` is cleared alongside: a retail strike-through beside a staff price
 * would advertise a discount that isn't the one being given.
 */
async function pricedForViewer<T extends ProductWithDetails>(products: T[]): Promise<T[]> {
  const { isEmployee } = await getViewerPricing();
  if (!isEmployee) return products;
  return products.map((p) => ({
    ...p,
    variants: p.variants.map((v) => ({ ...v, price: staffUnitPrice(v, p), mrp: null })),
  }));
}

/** Storefront categories — only those with at least one active product.
    (Admin pages query all categories directly.) */
export function getCategories() {
  return prisma.category.findMany({
    where: { products: { some: { isActive: true, line: "SNACKS" } } },
    orderBy: { sortOrder: "asc" },
  });
}

export async function getFeaturedProducts(take = 8) {
  return pricedForViewer(
    await prisma.product.findMany({
      where: { isActive: true, isFeatured: true, line: "SNACKS" },
      include: productInclude,
      orderBy: [{ isFlagship: "desc" }, { createdAt: "asc" }],
      take,
    })
  );
}

function productsWhere(opts: {
  categorySlug?: string;
  q?: string;
  line?: ProductLine;
}): Prisma.ProductWhereInput {
  const { categorySlug, q, line } = opts;
  return {
    isActive: true,
    // Each line has its own storefront section, so a listing never mixes
    // snacks and merchandise unless it deliberately asks for both.
    ...(line ? { line } : {}),
    ...(categorySlug ? { category: { slug: categorySlug } } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q } },
            { tamilName: { contains: q } },
            { description: { contains: q } },
          ],
        }
      : {}),
  };
}

/** Full unpaginated list — used by Build Your Box (client filters locally). */
export async function getProducts(
  opts: { categorySlug?: string; q?: string; line?: ProductLine } = {}
) {
  return pricedForViewer(
    await prisma.product.findMany({
      where: productsWhere(opts),
      include: productInclude,
      orderBy: [{ isFlagship: "desc" }, { createdAt: "desc" }],
    })
  );
}

export const PRODUCTS_PER_PAGE = 24;

/** Paginated listing for /products — scales to large catalogs. */
export async function getProductsPage(
  opts: {
    categorySlug?: string;
    q?: string;
    page?: number;
    perPage?: number;
    line?: ProductLine;
  } = {}
) {
  const where = productsWhere(opts);
  const perPage = opts.perPage ?? PRODUCTS_PER_PAGE;
  const total = await prisma.product.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / perPage));
  const page = Math.min(Math.max(1, opts.page ?? 1), pageCount);
  const products = await pricedForViewer(
    await prisma.product.findMany({
      where,
      include: productInclude,
      orderBy: [{ isFlagship: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * perPage,
      take: perPage,
    })
  );
  return { products, total, page, perPage, pageCount };
}

export async function getProductBySlug(slug: string) {
  const product = await prisma.product.findUnique({
    where: { slug },
    include: productInclude,
  });
  if (!product) return null;
  return (await pricedForViewer([product]))[0];
}

export async function getRelatedProducts(categoryId: string, excludeId: string, take = 4) {
  return pricedForViewer(
    await prisma.product.findMany({
      where: { isActive: true, categoryId, id: { not: excludeId } },
      include: productInclude,
      take,
    })
  );
}

/** All settings as a key→value map, with defaults filled in. */
export async function getSettings(): Promise<Record<string, string>> {
  const rows = await prisma.setting.findMany();
  const map = { ...DEFAULT_SETTINGS };
  for (const row of rows) map[row.key] = row.value;
  return map;
}

/**
 * Manual UPI settlement config — used until the payment gateway is live.
 * When `enabled`, checkout places the order and hands the customer UPI
 * instructions instead of opening the gateway.
 */
export async function getManualPaymentConfig() {
  const settings = await getSettings();
  return {
    enabled: settings[SETTINGS.MANUAL_UPI_PAYMENT] === "1",
    upiId: (settings[SETTINGS.UPI_ID] ?? "").trim(),
    payeeName: (settings[SETTINGS.STORE_NAME] ?? "").trim(),
    whatsappPhone: (settings[SETTINGS.STORE_PHONE] ?? "").trim(),
    notice: (settings[SETTINGS.PRE_LAUNCH_NOTICE] ?? "").trim(),
  };
}

export async function getShippingConfig() {
  const settings = await getSettings();
  return {
    shippingFee: parseInt(settings[SETTINGS.SHIPPING_FEE], 10) || 0,
    freeShippingAbove: parseInt(settings[SETTINGS.FREE_SHIPPING_ABOVE], 10) || 0,
    outsideTnPerKg: parseInt(settings[SETTINGS.OUTSIDE_TN_PER_KG], 10) || 0,
  };
}

/** Build-your-box discount tiers from settings. */
export async function getBoxTiers() {
  const settings = await getSettings();
  return parseBoxTiers(settings[SETTINGS.BOX_TIERS]);
}

/** A goodie tier row enriched with its variant's display/stock data. */
export type GoodieInfo = GoodieTier & {
  productName: string;
  variantLabel: string;
  image: string | null;
  weightGrams: number | null;
  stock: number;
  /** Variant + product active and enough stock for the goodie qty. */
  available: boolean;
};

export type DiscountConfig = {
  type: DiscountType;
  /** Percent tiers (used when type is "percent"). */
  tiers: BoxTier[];
  /** Goodie rows (empty unless type is "goodies"). */
  goodieTiers: GoodieInfo[];
};

/**
 * The full weight-reward config: which discount type is live plus its tiers.
 * Goodie rows whose variant was deleted are dropped; `available` marks rows
 * the storefront may advertise (checkout re-checks stock authoritatively).
 */
export async function getDiscountConfig(): Promise<DiscountConfig> {
  const settings = await getSettings();
  const rawType = settings[SETTINGS.DISCOUNT_TYPE];
  const type: DiscountType = DISCOUNT_TYPES.includes(rawType as DiscountType)
    ? (rawType as DiscountType)
    : "percent";
  const tiers = parseBoxTiers(settings[SETTINGS.BOX_TIERS]);
  const parsed = parseGoodieTiers(settings[SETTINGS.GOODIE_TIERS]);
  if (type !== "goodies" || parsed.length === 0) return { type, tiers, goodieTiers: [] };

  const variants = await prisma.productVariant.findMany({
    where: { id: { in: [...new Set(parsed.map((g) => g.variantId))] } },
    include: {
      product: {
        select: {
          name: true,
          isActive: true,
          images: { orderBy: { sortOrder: "asc" }, take: 1 },
        },
      },
    },
  });
  const byId = new Map(variants.map((v) => [v.id, v]));
  const goodieTiers = parsed.flatMap((g) => {
    const v = byId.get(g.variantId);
    if (!v) return [];
    return [
      {
        ...g,
        productName: v.product.name,
        variantLabel: v.label,
        image: v.product.images[0]?.url ?? null,
        weightGrams: v.weightGrams,
        stock: v.stock,
        available: v.isActive && v.product.isActive && v.stock >= g.qty,
      },
    ];
  });
  return { type, tiers, goodieTiers };
}
