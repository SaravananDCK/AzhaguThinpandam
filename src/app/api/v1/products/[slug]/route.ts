import { NextResponse } from "next/server";
import { getPreorderConfig, getProductBySlug, getRelatedProducts } from "@/lib/queries";
import { getApprovedReviews } from "@/lib/reviews";
import { isPreorderOpen, preorderDeadlineText } from "@/lib/preorder";
import { apiOrigin, serializeProduct } from "@/lib/api-serialize";

type Ctx = { params: Promise<{ slug: string }> };

/** One product with everything its screen shows: reviews, related items, pre-order terms. */
export async function GET(req: Request, { params }: Ctx) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product || !product.isActive) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }
  const origin = apiOrigin(req);

  const [reviews, related, preorderConfig] = await Promise.all([
    getApprovedReviews(product.id),
    getRelatedProducts(product.categoryId, product.id),
    product.preorder ? getPreorderConfig() : null,
  ]);

  return NextResponse.json({
    product: serializeProduct(product, origin),
    // Null for ordinary products. `closed` is "closed everywhere" — the
    // per-state cutoff is enforced when the cart is priced.
    preorder: preorderConfig && {
      closed: !isPreorderOpen(preorderConfig),
      deadline: preorderDeadlineText(preorderConfig),
      dispatchNote: preorderConfig.dispatchNote,
    },
    reviews: reviews.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
    related: related.map((p) => serializeProduct(p, origin)),
  });
}
