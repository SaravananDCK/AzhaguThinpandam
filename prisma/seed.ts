import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_SETTINGS, SETTINGS } from "../src/lib/constants";
import { applyMarginPricing } from "../src/lib/pricing";

const prisma = new PrismaClient();

const r = (rupees: number) => Math.round(rupees * 100); // rupees → paise

// Catalog source: "K S HOME 15.7.26" — Karthick Sweets & Kadalai Mittai,
// Kovilpatti. The per-kg figures are the SUPPLIER PRICES (what AzhaguThinpandam
// pays Karthick), stored as purchasePricePerKg. Retail variant prices are
// derived at DEFAULT_MARGIN with the standard bulk discounts, via the shared
// pricing rule, so Admin → Pricing "Recalculate" reproduces them.
const DEFAULT_MARGIN = 60;

// Larger sizes are delivered as multiple base packets; 200 g products step in
// 200 g (200/400/600/800/1kg), 250 g products in 250 g (250/500/750/1kg).
function weightsFor(basePackG: 200 | 250): { label: string; grams: number }[] {
  const steps = basePackG === 200 ? [200, 400, 600, 800, 1000] : [250, 500, 750, 1000];
  return steps.map((g) => ({ label: g < 1000 ? `${g} g` : "1 kg", grams: g }));
}
const STOCK_BY_INDEX = [50, 40, 30, 20, 12];

type SeedProduct = {
  name: string;
  tamilName: string;
  slug: string;
  description: string;
  basePackG: 200 | 250;
  costPerKg: number; // ₹/kg supplier price
  featured?: boolean;
  flagship?: boolean;
  inactive?: boolean; // hidden until priced & activated in admin
};
type SeedCategory = {
  name: string;
  tamilName: string;
  slug: string;
  products: SeedProduct[];
};

const catalog: SeedCategory[] = [
  {
    name: "Mittai & Urundai",
    tamilName: "மிட்டாய் & உருண்டை",
    slug: "mittai-urundai",
    products: [
      {
        name: "Kadalai Mittai",
        tamilName: "கடலை மிட்டாய்",
        slug: "kadalai-mittai",
        description:
          "The famous Kovilpatti kadalai mittai — crunchy peanut candy bars set in pure jaggery, made the traditional way. Our signature product.",
        basePackG: 250,
        costPerKg: 220,
        featured: true,
        flagship: true,
      },
      {
        name: "Cocoa Mittai",
        tamilName: "கொக்கோ மிட்டாய்",
        slug: "cocoa-mittai",
        description:
          "A modern twist on the classic — peanut candy with a layer of cocoa. A favourite with kids.",
        basePackG: 200,
        costPerKg: 260,
      },
      {
        name: "Ellu Mittai",
        tamilName: "எள்ளு மிட்டாய்",
        slug: "ellu-mittai",
        description: "Crisp sesame candy bars in jaggery — iron-rich, light and moreish.",
        basePackG: 200,
        costPerKg: 225,
      },
      {
        name: "Karupatti Kadalai Mittai",
        tamilName: "கருப்பட்டி கடலை மிட்டாய்",
        slug: "karupatti-kadalai-mittai",
        description:
          "Kadalai mittai made with karupatti (palm jaggery) instead of cane jaggery — deeper flavour, naturally rich in minerals.",
        basePackG: 200,
        costPerKg: 325,
        featured: true,
      },
      {
        name: "Kadalai Urundai",
        tamilName: "கடலை உருண்டை",
        slug: "kadalai-urundai",
        description:
          "Hand-rolled peanut and jaggery balls — the traditional evening snack of Tamil homes.",
        basePackG: 200,
        costPerKg: 200,
      },
      {
        name: "Ellu Urundai",
        tamilName: "எள்ளு உருண்டை",
        slug: "ellu-urundai",
        description:
          "Wholesome sesame and jaggery balls — a healthy traditional treat rich in iron.",
        basePackG: 200,
        costPerKg: 200,
      },
      {
        name: "Pori Kadalai Urundai",
        tamilName: "பொரி கடலை உருண்டை",
        slug: "pori-kadalai-urundai",
        description:
          "Puffed pori and peanut balls bound in jaggery — light, crunchy and impossible to stop at one.",
        basePackG: 200,
        costPerKg: 175,
      },
      // Not on the current list — kept hidden, reactivate in admin if needed
      {
        name: "Special Kadalai Mittai",
        tamilName: "SPL கடலை மிட்டாய்",
        slug: "special-kadalai-mittai",
        description:
          "Premium-grade Kovilpatti kadalai mittai with extra peanuts and richer jaggery — our best-seller for gifting.",
        basePackG: 250,
        costPerKg: 240,
        inactive: true,
      },
      {
        name: "Seeni Mittai",
        tamilName: "சீனி மிட்டாய்",
        slug: "seeni-mittai",
        description: "Old-school sugar candy bars — a nostalgic pettikadai favourite.",
        basePackG: 200,
        costPerKg: 150,
        inactive: true,
      },
      {
        name: "Karupatti Mittai",
        tamilName: "கருப்பட்டி மிட்டாய்",
        slug: "karupatti-mittai",
        description: "Palm jaggery candy — deep caramel notes, naturally rich in minerals.",
        basePackG: 200,
        costPerKg: 260,
        inactive: true,
      },
    ],
  },
  {
    name: "Sev & Seeval",
    tamilName: "சேவு & சீவல்",
    slug: "sev-seeval",
    products: [
      {
        name: "Sev",
        tamilName: "சேவு",
        slug: "sev",
        description:
          "Classic crunchy sev made from gram flour, fried fresh in small batches.",
        basePackG: 250,
        costPerKg: 220,
      },
      {
        name: "Seeval",
        tamilName: "சீவல்",
        slug: "seeval",
        description:
          "Thin, crisp seeval ribbons — light, flaky and perfect with evening tea.",
        basePackG: 250,
        costPerKg: 220,
      },
      {
        name: "Seeni Sev",
        tamilName: "சீனி சேவு",
        slug: "seeni-sev",
        description: "Sweet sev glazed with sugar — a crunchy sweet-and-savoury classic.",
        basePackG: 250,
        costPerKg: 180,
      },
      {
        name: "Karupatti Sev",
        tamilName: "கருப்பட்டி சேவு",
        slug: "karupatti-sev",
        description: "Sev coated in karupatti (palm jaggery) — an earthy, healthier sweet crunch.",
        basePackG: 250,
        costPerKg: 180,
      },
      {
        name: "Pattarai Sev",
        tamilName: "பட்டரை சேவு",
        slug: "pattarai-sev",
        description:
          "Traditional pattarai-style sev — thicker cut, extra crunchy, seasoned the old way.",
        basePackG: 250,
        costPerKg: 220,
      },
      {
        name: "Pattarai Seeval",
        tamilName: "பட்டரை சீவல்",
        slug: "pattarai-seeval",
        description:
          "Pattarai-style seeval — hand-cut flakes with a deeper roast and bolder seasoning.",
        basePackG: 250,
        costPerKg: 220,
      },
      {
        name: "Kara Seeval",
        tamilName: "கார சீவல்",
        slug: "kara-seeval",
        description: "Spicy seeval with chilli and curry leaves — for those who like it hot.",
        basePackG: 250,
        costPerKg: 220,
      },
    ],
  },
  {
    name: "Mixture & Murukku",
    tamilName: "மிக்சர் & முறுக்கு",
    slug: "mixture-murukku",
    products: [
      {
        name: "Mixture",
        tamilName: "மிக்சர்",
        slug: "mixture",
        description:
          "Our signature South Indian mixture — sev, boondi, peanuts, curry leaves and fried gram in a moreish blend.",
        basePackG: 250,
        costPerKg: 220,
      },
      {
        name: "Paruvattu Mixture",
        tamilName: "பருவட்டு மிக்சர்",
        slug: "paruvattu-mixture",
        description:
          "Country-style paruvattu mixture with crisp lentil fritter pieces folded through.",
        basePackG: 250,
        costPerKg: 220,
      },
      {
        name: "Ragi Mixture",
        tamilName: "ராகி மிக்சர்",
        slug: "ragi-mixture",
        description:
          "Millet-powered mixture made with ragi (finger millet) — the guilt-free crunchy snack.",
        basePackG: 250,
        costPerKg: 220,
        featured: true,
      },
      {
        name: "Omapodi Mixture",
        tamilName: "ஓமப்பொடி மிக்சர்",
        slug: "omapodi-mixture",
        description:
          "Fine omapodi (ajwain sev) mixture — delicate strands with a digestive ajwain aroma.",
        basePackG: 250,
        costPerKg: 240,
      },
      {
        name: "Butter Murukku",
        tamilName: "பட்டர் முறுக்கு",
        slug: "butter-murukku",
        description:
          "Light, airy and melt-in-the-mouth butter murukku — a softer, richer cousin of the classic.",
        basePackG: 250,
        costPerKg: 240,
        featured: true,
      },
      {
        name: "Kara Boondi",
        tamilName: "கார பூந்தி",
        slug: "kara-boondi",
        description:
          "Spicy gram-flour boondi pearls with peanuts and curry leaves — great on its own or over curd rice.",
        basePackG: 250,
        costPerKg: 240,
      },
      {
        name: "Kaaram Murukku",
        tamilName: "காரம் முறுக்கு",
        slug: "kaaram-murukku",
        description: "Fiery hand-twisted murukku for those who like real heat.",
        basePackG: 250,
        costPerKg: 220,
        inactive: true,
      },
      {
        name: "Manapparai Murukku",
        tamilName: "மணப்பாறை முறுக்கு",
        slug: "manapparai-murukku",
        description: "The famous Manapparai-style murukku — extra crisp, extra moreish.",
        basePackG: 250,
        costPerKg: 220,
        inactive: true,
      },
      {
        name: "Ragi Murukku",
        tamilName: "ராகி முறுக்கு",
        slug: "ragi-murukku",
        description: "Finger-millet murukku — the wholesome twist on the classic.",
        basePackG: 250,
        costPerKg: 220,
        inactive: true,
      },
      {
        name: "Pudhina Mixture",
        tamilName: "புதினா மிக்சர்",
        slug: "pudhina-mixture",
        description: "Mixture tossed with fresh mint — cool aroma, spicy crunch.",
        basePackG: 250,
        costPerKg: 220,
        inactive: true,
      },
    ],
  },
  {
    name: "Kadalai Snacks",
    tamilName: "கடலை வகைகள்",
    slug: "kadalai-snacks",
    products: [
      {
        name: "Masala Kadalai",
        tamilName: "மசால் கடலை",
        slug: "masala-kadalai",
        description:
          "Whole peanuts coated in a spiced gram-flour shell and fried crisp — the king of tea-time snacks.",
        basePackG: 200,
        costPerKg: 225,
        featured: true,
      },
      {
        name: "Masala Pori Kadalai",
        tamilName: "மசால் பொரி கடலை",
        slug: "masala-pori-kadalai",
        description:
          "Roasted peanuts tossed in a tangy masala — light, protein-rich and addictive.",
        basePackG: 200,
        costPerKg: 175,
      },
      {
        name: "Ennai Kadalai",
        tamilName: "எண்ணெய் கடலை",
        slug: "ennai-kadalai",
        description:
          "Golden oil-fried peanuts with salt and a hint of garlic — simple and perfect.",
        basePackG: 200,
        costPerKg: 200,
      },
    ],
  },
  {
    name: "Halwa",
    tamilName: "அல்வா",
    slug: "halwa",
    products: [
      {
        name: "Ney Alva",
        tamilName: "நெய் அல்வா",
        slug: "ney-alva",
        description:
          "Rich ghee halwa slow-cooked to a glossy, melt-in-the-mouth finish — a festive Tirunelveli-style treat.",
        basePackG: 250,
        costPerKg: 280,
        featured: true,
      },
      {
        name: "Wheat Halwa",
        tamilName: "கோதுமை அல்வா",
        slug: "wheat-halwa",
        description: "Glossy, ghee-rich wheat halwa slow-cooked the Tirunelveli way.",
        basePackG: 250,
        costPerKg: 240,
        inactive: true,
      },
      {
        name: "Carrot Halwa",
        tamilName: "கேரட் அல்வா",
        slug: "carrot-halwa",
        description: "Classic carrot halwa with ghee, milk and cashew.",
        basePackG: 250,
        costPerKg: 240,
        inactive: true,
      },
      {
        name: "Karupatti Halwa",
        tamilName: "கருப்பட்டி அல்வா",
        slug: "karupatti-halwa",
        description: "Halwa sweetened with palm jaggery — earthy, deep and rich.",
        basePackG: 250,
        costPerKg: 260,
        inactive: true,
      },
    ],
  },
];

async function main() {
  // --- Admin user ---
  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? "admin@azhaguthinpandam.com").toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "Admin@123";
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: "ADMIN" },
    create: {
      email: adminEmail,
      name: "Store Admin",
      passwordHash: await bcrypt.hash(adminPassword, 10),
      role: "ADMIN",
    },
  });
  console.log(`Admin user: ${adminEmail} / ${adminPassword} (change this password!)`);

  // --- Settings ---
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await prisma.setting.upsert({ where: { key }, update: {}, create: { key, value } });
  }
  const roundSetting = await prisma.setting.findUnique({
    where: { key: SETTINGS.ROUND_TO_FIVE },
  });
  const roundToFive = roundSetting?.value !== "0";

  // --- Catalog ---
  let catSort = 0;
  for (const cat of catalog) {
    const category = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, tamilName: cat.tamilName },
      create: {
        name: cat.name,
        tamilName: cat.tamilName,
        slug: cat.slug,
        sortOrder: catSort++,
        image: `/products/cat-${cat.slug}.webp`,
      },
    });

    for (const p of cat.products) {
      const product = await prisma.product.upsert({
        where: { slug: p.slug },
        update: {
          name: p.name,
          tamilName: p.tamilName,
          description: p.description,
          isFeatured: p.featured ?? false,
          isFlagship: p.flagship ?? false,
          categoryId: category.id,
          purchasePricePerKg: r(p.costPerKg),
          profitMarginPct: DEFAULT_MARGIN,
        },
        create: {
          name: p.name,
          tamilName: p.tamilName,
          slug: p.slug,
          description: p.description,
          isFeatured: p.featured ?? false,
          isFlagship: p.flagship ?? false,
          isActive: !p.inactive,
          categoryId: category.id,
          purchasePricePerKg: r(p.costPerKg),
          profitMarginPct: DEFAULT_MARGIN,
        },
      });

      // Attach / refresh the product photo
      const firstImage = await prisma.productImage.findFirst({
        where: { productId: product.id },
        orderBy: { sortOrder: "asc" },
      });
      if (!firstImage) {
        await prisma.productImage.create({
          data: { productId: product.id, url: `/products/${p.slug}.webp`, sortOrder: 0 },
        });
      }

      // Variants derived from cost + margin (with bulk discounts)
      const weights = weightsFor(p.basePackG);
      const priced = applyMarginPricing(
        weights.map((w) => w.label),
        r(p.costPerKg),
        DEFAULT_MARGIN,
        { roundToFive }
      );
      for (const [i, w] of weights.entries()) {
        const pv = priced[i];
        if (!pv) continue;
        const sku = `${p.slug}-${w.label.replace(/\s+/g, "").toLowerCase()}`;
        await prisma.productVariant.upsert({
          where: { sku },
          update: { price: pv.price, mrp: pv.mrp, isActive: true },
          create: {
            productId: product.id,
            label: w.label,
            price: pv.price,
            mrp: pv.mrp,
            stock: p.inactive ? 0 : (STOCK_BY_INDEX[i] ?? 12),
            sku,
            sortOrder: i,
          },
        });
      }
    }
  }

  // --- Coupons ---
  // Grand-opening offer advertised on the homepage banner: 18% off, first
  // purchase only (one redemption per phone number).
  await prisma.coupon.upsert({
    where: { code: "AADIAMARKALAM18" },
    update: {},
    create: {
      code: "AADIAMARKALAM18",
      type: "PERCENT",
      value: 18,
      minOrder: 0,
      perCustomerLimit: 1,
      isActive: true,
    },
  });

  const counts = {
    categories: await prisma.category.count(),
    products: await prisma.product.count(),
    activeProducts: await prisma.product.count({ where: { isActive: true } }),
    variants: await prisma.productVariant.count(),
    coupons: await prisma.coupon.count(),
  };
  console.log("Seeded:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
