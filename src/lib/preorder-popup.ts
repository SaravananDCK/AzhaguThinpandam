// The welcome pop-up that lists pre-order combos while booking is open.
// Server-only (reads products); the dialog itself is
// src/components/store/preorder-dialog.tsx.
import { hash } from "@/lib/announcement";
import { isPreorderOpen, preorderDeadlineText } from "@/lib/preorder";
import { getPreorderConfig, getPreorderProducts } from "@/lib/queries";

export type PreorderPopupProduct = {
  slug: string;
  name: string;
  tamilName: string | null;
  image: string | null;
  /** Cheapest active pack, paise */
  price: number;
};

export type PreorderPopup = {
  /** Changes with the combos, their prices or the cutoff, so an edit re-shows a dismissed pop-up */
  id: string;
  deadline: string;
  dispatchNote: string;
  products: PreorderPopupProduct[];
};

/**
 * Null once booking has closed, or when no active product is marked
 * pre-order — so it switches itself off on the closing day with nothing to
 * remember in Settings.
 */
export async function getPreorderPopup(): Promise<PreorderPopup | null> {
  const config = await getPreorderConfig();
  if (!isPreorderOpen(config)) return null;
  const products = await getPreorderProducts();
  const items = products
    .filter((p) => p.variants.length > 0)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      tamilName: p.tamilName,
      image: p.images[0]?.url ?? null,
      price: Math.min(...p.variants.map((v) => v.price)),
    }));
  if (!items.length) return null;
  return {
    id: hash(
      [config.closeDay, ...items.map((i) => `${i.slug}:${i.price}:${i.image ?? ""}`)].join("\n")
    ),
    deadline: preorderDeadlineText(config),
    dispatchNote: config.dispatchNote,
    products: items,
  };
}
