import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { DEFAULT_SETTINGS, SETTINGS, type ProductLine } from "@/lib/constants";
import { parseBoxTiers } from "@/lib/box";

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

/** Storefront categories — only those with at least one active product.
    (Admin pages query all categories directly.) */
export function getCategories() {
  return prisma.category.findMany({
    where: { products: { some: { isActive: true, line: "SNACKS" } } },
    orderBy: { sortOrder: "asc" },
  });
}

export function getFeaturedProducts(take = 8) {
  return prisma.product.findMany({
    where: { isActive: true, isFeatured: true, line: "SNACKS" },
    include: productInclude,
    orderBy: [{ isFlagship: "desc" }, { createdAt: "asc" }],
    take,
  });
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
export function getProducts(
  opts: { categorySlug?: string; q?: string; line?: ProductLine } = {}
) {
  return prisma.product.findMany({
    where: productsWhere(opts),
    include: productInclude,
    orderBy: [{ isFlagship: "desc" }, { createdAt: "desc" }],
  });
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
  const products = await prisma.product.findMany({
    where,
    include: productInclude,
    orderBy: [{ isFlagship: "desc" }, { createdAt: "desc" }],
    skip: (page - 1) * perPage,
    take: perPage,
  });
  return { products, total, page, perPage, pageCount };
}

export function getProductBySlug(slug: string) {
  return prisma.product.findUnique({
    where: { slug },
    include: productInclude,
  });
}

export function getRelatedProducts(categoryId: string, excludeId: string, take = 4) {
  return prisma.product.findMany({
    where: { isActive: true, categoryId, id: { not: excludeId } },
    include: productInclude,
    take,
  });
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
