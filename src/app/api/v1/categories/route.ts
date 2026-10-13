import { NextResponse } from "next/server";
import { getCategories } from "@/lib/queries";
import { absoluteUrl, apiOrigin } from "@/lib/api-serialize";

/** Storefront categories that have something to sell, in display order. */
export async function GET(req: Request) {
  const origin = apiOrigin(req);
  const categories = await getCategories();
  return NextResponse.json({
    categories: categories.map((c) => ({
      slug: c.slug,
      name: c.name,
      tamilName: c.tamilName,
      image: absoluteUrl(c.image, origin),
    })),
  });
}
