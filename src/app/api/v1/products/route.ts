import { NextResponse } from "next/server";
import { getFeaturedProducts, getProductsPage } from "@/lib/queries";
import { PRODUCT_LINES, type ProductLine } from "@/lib/constants";
import { apiOrigin, serializeProduct } from "@/lib/api-serialize";

/**
 * Product listing for the app.
 *   ?category=slug  ?q=search  ?page=2  ?line=SNACKS|MAGNETS  ?featured=1
 * Prices are the ones this viewer would pay (staff pricing applies when the
 * request carries a staff member's token).
 */
export async function GET(req: Request) {
  const origin = apiOrigin(req);
  const params = new URL(req.url).searchParams;

  if (params.get("featured") === "1") {
    const products = await getFeaturedProducts();
    return NextResponse.json({
      products: products.map((p) => serializeProduct(p, origin)),
      page: 1,
      pageCount: 1,
      total: products.length,
    });
  }

  const lineParam = params.get("line");
  const line = PRODUCT_LINES.includes(lineParam as ProductLine)
    ? (lineParam as ProductLine)
    : undefined;
  const { products, page, pageCount, total } = await getProductsPage({
    categorySlug: params.get("category") || undefined,
    q: params.get("q")?.trim().slice(0, 100) || undefined,
    page: parseInt(params.get("page") ?? "1", 10) || 1,
    line,
  });

  return NextResponse.json({
    products: products.map((p) => serializeProduct(p, origin)),
    page,
    pageCount,
    total,
  });
}
