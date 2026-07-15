import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { DEFAULT_SETTINGS, SETTINGS } from "@/lib/constants";
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
    where: { products: { some: { isActive: true } } },
    orderBy: { sortOrder: "asc" },
  });
}

export function getFeaturedProducts(take = 8) {
  return prisma.product.findMany({
    where: { isActive: true, isFeatured: true },
    include: productInclude,
    orderBy: [{ isFlagship: "desc" }, { createdAt: "asc" }],
    take,
  });
}

export function getProducts(opts: { categorySlug?: string; q?: string } = {}) {
  const { categorySlug, q } = opts;
  return prisma.product.findMany({
    where: {
      isActive: true,
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
    },
    include: productInclude,
    orderBy: [{ isFlagship: "desc" }, { createdAt: "desc" }],
  });
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

export async function getShippingConfig() {
  const settings = await getSettings();
  return {
    shippingFee: parseInt(settings[SETTINGS.SHIPPING_FEE], 10) || 0,
    freeShippingAbove: parseInt(settings[SETTINGS.FREE_SHIPPING_ABOVE], 10) || 0,
  };
}

export function computeShippingFee(
  subtotal: number,
  config: { shippingFee: number; freeShippingAbove: number }
) {
  if (config.freeShippingAbove > 0 && subtotal >= config.freeShippingAbove) return 0;
  return config.shippingFee;
}

/** Build-your-box discount tiers from settings. */
export async function getBoxTiers() {
  const settings = await getSettings();
  return parseBoxTiers(settings[SETTINGS.BOX_TIERS]);
}
