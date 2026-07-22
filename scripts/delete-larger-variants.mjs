// PERMANENTLY deletes each product's larger packs, keeping only the base
// (smallest) pack. Safe: order & purchase history is preserved (those line
// items keep their snapshot; their variantId is set to null), and stock
// movements for the deleted variants are removed. Runs in the production
// container:  docker compose exec app node scripts/delete-larger-variants.mjs
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function grams(label) {
  const m = String(label).match(/([0-9.]+)\s*(kg|g)/i);
  if (!m) return Infinity;
  return m[2].toLowerCase() === "kg" ? parseFloat(m[1]) * 1000 : parseFloat(m[1]);
}

async function main() {
  const products = await prisma.product.findMany({ include: { variants: true } });
  let deleted = 0;
  let kept = 0;
  for (const p of products) {
    if (!p.variants.length) continue;
    const base = [...p.variants].sort((a, b) => grams(a.label) - grams(b.label))[0];
    for (const v of p.variants) {
      if (v.id === base.id) {
        kept++;
        continue;
      }
      await prisma.productVariant.delete({ where: { id: v.id } });
      deleted++;
    }
  }
  console.log(`deleted ${deleted} larger packs, kept ${kept} base variants.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
