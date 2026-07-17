// Idempotent "seed-level data" sync for the LIVE database. Plain Node (no tsx),
// so it runs inside the production container. It only CREATES missing rows — it
// never overwrites an existing coupon, setting, or the catalog — so it is safe
// to run on every deploy (the entrypoint does exactly that) and safe to run by
// hand:  docker compose exec app node scripts/seed-live.mjs
//
// To CHANGE an existing setting or coupon on the live site, use the admin panel
// (Admin → Settings / Admin → Coupons); this script won't clobber those.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Coupons to ensure exist on the live site.
const COUPONS = [
  { code: "AADIAMARKALAM18", type: "PERCENT", value: 18, minOrder: 0, perCustomerLimit: 1, isActive: true },
];

// Settings to seed only when the key is missing (mirrors prisma/seed.ts).
const SETTINGS = {
  box_discount_tiers: "1:5,3:10,4:15,6:20",
  round_prices_to_five: "1",
};

async function main() {
  const created = [];

  for (const c of COUPONS) {
    const existing = await prisma.coupon.findUnique({ where: { code: c.code } });
    if (!existing) {
      await prisma.coupon.create({ data: c });
      created.push(`coupon ${c.code}`);
    }
  }

  for (const [key, value] of Object.entries(SETTINGS)) {
    const existing = await prisma.setting.findUnique({ where: { key } });
    if (!existing) {
      await prisma.setting.create({ data: { key, value } });
      created.push(`setting ${key}`);
    }
  }

  console.log(
    created.length
      ? `[seed-live] created: ${created.join(", ")}`
      : "[seed-live] nothing to create — live data already up to date."
  );
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("[seed-live] error:", e);
  process.exit(1);
});
