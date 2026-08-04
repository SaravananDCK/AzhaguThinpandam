import type { Metadata } from "next";
import { getProductsPage } from "@/lib/queries";
import { ProductCard } from "@/components/store/product-card";
import { Reveal } from "@/components/store/reveal";

export const metadata: Metadata = {
  title: "Azhagu Magnets",
  description:
    "Fridge magnets from Azhagu — handmade keepsakes alongside our traditional Tamil snacks.",
};

type Props = { searchParams: Promise<{ page?: string }> };

export default async function MagnetsPage({ searchParams }: Props) {
  const { page } = await searchParams;
  const { products } = await getProductsPage({
    line: "MAGNETS",
    page: Number(page) || 1,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Reveal>
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-600">
            Azhagu Magnets
          </p>
          <h1 className="mt-2 font-heading text-3xl font-bold sm:text-4xl">
            Fridge magnets
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Little keepsakes to brighten your kitchen. Add them to any snack
            order — they ship together.
          </p>
        </div>
      </Reveal>

      {products.length === 0 ? (
        <p className="mt-16 text-center text-muted-foreground">
          Nothing here just yet — magnets are on their way.
        </p>
      ) : (
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((p, i) => (
            <Reveal key={p.id} delay={(i % 4) * 90}>
              <ProductCard product={p} />
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
