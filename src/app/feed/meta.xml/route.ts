import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/queries";
import { SETTINGS, type ProductLine } from "@/lib/constants";
import { absoluteUrl, siteUrl } from "@/lib/seo";
import { isSellable, sellableQty } from "@/lib/availability";

/**
 * Product catalog feed for Meta Commerce Manager (RSS 2.0, Google Shopping
 * field names — the format Meta reads).
 *
 * One item per **variant**, not per product. `g:id` has to be the same variant
 * id the pixel sends as `content_ids` (see src/lib/fbq.ts and meta-capi.ts),
 * because that id is the entire join between a browsing event and a catalog
 * item. Get it wrong and dynamic ads silently never fire. `g:item_group_id`
 * puts the 250 g / 500 g / 1 kg packs back together as one product.
 *
 * Deliberately public and anonymous: Meta's crawler has no session. That also
 * means list prices only — never staffUnitPrice, which would publish employee
 * pricing to the open internet.
 */

// Rendered per request, not prerendered. The Docker build runs against an
// empty throwaway database (see Dockerfile), so an ISR-cached feed would ship
// with no products in it and serve that until the first revalidation — long
// enough for Meta's daily fetch to find an empty catalog and pull every item.
// One query a day for the crawler is the cheaper mistake. The Cache-Control
// header below still lets a CDN hold it for an hour.
export const dynamic = "force-dynamic";

/** Meta's category taxonomy, per product line. */
const GOOGLE_CATEGORY: Record<ProductLine, string> = {
  SNACKS: "Food, Beverages & Tobacco > Food Items > Snack Foods",
  MAGNETS: "Home & Garden > Decor > Refrigerator Magnets",
};

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function tag(name: string, value: string): string {
  return `      <${name}>${escapeXml(value)}</${name}>`;
}

/** Meta wants "249.00 INR" — a decimal amount and the currency code. */
function feedPrice(paise: number): string {
  return `${(paise / 100).toFixed(2)} INR`;
}

/** Images are stored as site-relative paths; Meta needs a fetchable URL. */
function imageUrl(url: string): string {
  return /^https?:\/\//i.test(url) ? url : absoluteUrl(url);
}

export async function GET() {
  const [settings, products] = await Promise.all([
    getSettings(),
    prisma.product.findMany({
      where: { isActive: true },
      include: {
        category: { select: { name: true } },
        images: { orderBy: { sortOrder: "asc" } },
        variants: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
      },
    }),
  ]);

  const brand = (settings[SETTINGS.STORE_NAME] ?? "Azhagu Thinpandam").trim();
  const items: string[] = [];

  for (const product of products) {
    // Meta rejects an item whose image it cannot fetch, and a high error rate
    // can disable the whole feed — so a product with no image is left out
    // rather than sent in to fail.
    const [primaryImage, ...otherImages] = product.images;
    if (!primaryImage) continue;

    const category = GOOGLE_CATEGORY[product.line as ProductLine];

    for (const variant of product.variants) {
      // The strike-through price is the "regular" price to Meta, and what we
      // actually charge is the sale price. Without that split an ad can't show
      // a discount, because nothing says one exists.
      const onSale = variant.mrp !== null && variant.mrp > variant.price;

      const fields = [
        tag("g:id", variant.id),
        tag("g:item_group_id", product.id),
        tag(
          "g:title",
          `${product.name}${product.tamilName ? ` (${product.tamilName})` : ""} — ${variant.label}`.slice(
            0,
            200
          )
        ),
        // Newlines are legal but make the feed hard to eyeball when debugging.
        tag("g:description", product.description.replace(/\s+/g, " ").trim().slice(0, 5000)),
        tag("g:link", absoluteUrl(`/product/${product.slug}`)),
        tag("g:image_link", imageUrl(primaryImage.url)),
        tag("g:brand", brand),
        tag("g:condition", "new"),
        tag(
          "g:availability",
          isSellable(variant.stock, product.madeToOrder) ? "in stock" : "out of stock"
        ),
        tag("g:price", feedPrice(onSale ? variant.mrp! : variant.price)),
        ...(onSale ? [tag("g:sale_price", feedPrice(variant.price))] : []),
        tag("g:quantity_to_sell_on_facebook", String(sellableQty(variant.stock, product.madeToOrder))),
        tag("g:product_type", product.category.name),
        ...(category ? [tag("g:google_product_category", category)] : []),
        // Handmade snacks have no barcode. Saying so stops Meta holding the
        // item back for a missing GTIN.
        tag("g:identifier_exists", "no"),
        ...otherImages
          .slice(0, 10)
          .map((img) => tag("g:additional_image_link", imageUrl(img.url))),
      ];

      items.push(`    <item>\n${fields.join("\n")}\n    </item>`);
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${escapeXml(brand)}</title>
    <link>${escapeXml(siteUrl())}</link>
    <description>${escapeXml(`${brand} product catalog`)}</description>
${items.join("\n")}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600",
    },
  });
}
