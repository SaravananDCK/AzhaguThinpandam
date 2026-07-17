import type { Metadata } from "next";
import { getBoxTiers, getProducts } from "@/lib/queries";
import { BoxBuilder } from "@/components/store/box-builder";

export const metadata: Metadata = {
  title: "Build Your Box",
  description:
    "Pick any mix of our snacks and sweets — the more you add, the bigger your discount.",
};

export default async function BuildBoxPage() {
  const [products, tiers] = await Promise.all([getProducts(), getBoxTiers()]);

  // One row per product: its base (smallest) in-stock pack is the box unit
  const items = products
    .map((p) => {
      const variant = p.variants.find((v) => v.stock > 0) ?? p.variants[0];
      if (!variant) return null;
      return {
        variantId: variant.id,
        productSlug: p.slug,
        productName: p.name,
        tamilName: p.tamilName,
        category: p.category.name,
        label: variant.label,
        price: variant.price,
        stock: variant.stock,
        image: p.images[0]?.url ?? null,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="font-heading text-2xl font-bold sm:text-3xl">Build Your Box</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Mix and match your favourites — the fuller the box, the bigger the discount.
      </p>
      <BoxBuilder items={items} tiers={tiers} />
    </div>
  );
}
