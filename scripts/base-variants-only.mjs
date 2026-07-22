// Keeps only each product's BASE (smallest) pack active and hides the larger
// packs. Reversible — the larger variants are only deactivated, not deleted, so
// they can be re-enabled in Admin → Products. Plain Node, runs in the production
// container:  docker compose exec app node scripts/base-variants-only.mjs
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function grams(label) {
  const m = String(label).match(/([0-9.]+)\s*(kg|g)/i);
  if (!m) return Infinity;
  return m[2].toLowerCase() === "kg" ? parseFloat(m[1]) * 1000 : parseFloat(m[1]);
}

async function main() {
  const products = await prisma.product.findMany({ include: { variants: true } });
  let hidden = 0;
  let kept = 0;
  for (const p of products) {
    if (!p.variants.length) continue;
    const base = [...p.variants].sort((a, b) => grams(a.label) - grams(b.label))[0];
    for (const v of p.variants) {
      const shouldBeActive = v.id === base.id;
      if (v.isActive !== shouldBeActive) {
        await prisma.productVariant.update({
          where: { id: v.id },
          data: { isActive: shouldBeActive },
        });
      }
      if (shouldBeActive) kept++;
      else hidden++;
    }
  }
  console.log(`base-only: kept ${kept} base variants active, hid ${hidden} larger packs.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
