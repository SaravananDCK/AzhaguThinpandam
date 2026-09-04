"use client";

import { useEffect } from "react";
import { trackFbq } from "@/lib/fbq";

/**
 * Fires the Meta Pixel `ViewContent` event for a product detail page.
 *
 * Unlike `Purchase` this is deliberately unguarded — every view counts, and a
 * customer coming back to the same product is a signal, not a duplicate sale.
 *
 * `content_ids` carries every variant of the product (the same variant ids
 * `Purchase` reports), so a view and the sale that follows line up against one
 * catalog. `value` is the cheapest pack, matching the `lowPrice` the page
 * already advertises in its Product structured data.
 */
export function ViewContentPixel({
  productSlug,
  productName,
  category,
  variantIds,
  value,
}: {
  productSlug: string;
  productName: string;
  category: string;
  variantIds: string[];
  value: number; // rupees
}) {
  useEffect(() => {
    trackFbq("ViewContent", {
      content_type: "product",
      content_ids: variantIds,
      content_name: productName,
      content_category: category,
      value,
      currency: "INR",
    });
    // Keyed on the product alone: `variantIds` is a fresh array every render,
    // and nothing else changes without the slug changing too.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productSlug]);

  return null;
}
