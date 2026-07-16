import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_SETTINGS } from "../src/lib/constants";

const prisma = new PrismaClient();

const r = (rupees: number) => Math.round(rupees * 100); // rupees → paise

// Bulk sizes are discounted off the linear price (mrp): 5% on 500 g, 10% on 1 kg.
// The undiscounted linear price is stored as mrp so the strike-through +
// "% off" badge renders automatically.
const BULK_DISCOUNTS: Record<number, number> = { 500: 0.05, 1000: 0.1 };

function gramsOf(label: string): number | null {
  const m = label.trim().match(/^(\d+(?:\.\d+)?)\s*(g|kg)$/i);
  if (!m) return null;
  return m[2].toLowerCase() === "kg" ? parseFloat(m[1]) * 1000 : parseFloat(m[1]);
}

function applyBulkDiscounts(variants: SeedVariant[]): SeedVariant[] {
  const parsed = variants
    .map((v) => ({ v, g: gramsOf(v.label) }))
    .filter((x): x is { v: SeedVariant; g: number } => x.g !== null)
    .sort((a, b) => a.g - b.g);
  const base = parsed[0];
  if (!base) return variants;
  const perGram = base.v.price / base.g;

  return variants.map((v) => {
    const g = gramsOf(v.label);
    const discount = g ? BULK_DISCOUNTS[g] : undefined;
    if (!g || discount === undefined) return v;
    const mrp = Math.round((perGram * g) / 100) * 100; // linear price, whole ₹
    const price = Math.round((mrp * (1 - discount)) / 100) * 100;
    return { ...v, mrp, price };
  });
}

// Catalog source: "K S LIST 13.3.26" — Karthick Sweets & Kadalai Mittai,
// Kovilpatti price list (13-03-2026). The list gives WHOLESALE purchase
// prices per 1 kg (minimum 40 kg orders). Retail prices below are derived
// from those with a ~25% markup, rounded to the nearest ₹5 per pack —
// they are PLACEHOLDERS: review and adjust in Admin → Products.

type SeedVariant = { label: string; price: number; mrp?: number; stock: number };
type SeedProduct = {
  name: string;
  tamilName: string;
  slug: string;
  description: string;
  featured?: boolean;
  flagship?: boolean; // pinned to the top of listings with a Signature badge
  // Not on the price list yet: seeded hidden with placeholder prices and zero
  // stock — price & activate in Admin → Products. (Only applied on create, so
  // re-seeding never re-hides a product an admin has activated.)
  inactive?: boolean;
  variants: SeedVariant[];
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
        featured: true,
        flagship: true,
        variants: [
          { label: "250 g", price: r(65), stock: 60 },
          { label: "500 g", price: r(125), stock: 40 },
          { label: "1 kg", price: r(250), stock: 20 },
        ],
      },
      {
        name: "Special Kadalai Mittai",
        tamilName: "SPL கடலை மிட்டாய்",
        slug: "special-kadalai-mittai",
        description:
          "Premium-grade Kovilpatti kadalai mittai with extra peanuts and richer jaggery — our best-seller for gifting.",
        featured: true,
        flagship: true,
        variants: [
          { label: "250 g", price: r(70), stock: 50 },
          { label: "500 g", price: r(140), stock: 35 },
          { label: "1 kg", price: r(280), stock: 15 },
        ],
      },
      {
        name: "Karupatti Kadalai Mittai",
        tamilName: "கருப்பட்டி கடலை மிட்டாய்",
        slug: "karupatti-kadalai-mittai",
        description:
          "Kadalai mittai made with karupatti (palm jaggery) instead of cane jaggery — deeper flavour, naturally rich in minerals.",
        featured: true,
        variants: [
          { label: "200 g", price: r(75), stock: 40 },
          { label: "500 g", price: r(190), stock: 25 },
          { label: "1 kg", price: r(380), stock: 12 },
        ],
      },
      {
        name: "Cocoa Mittai",
        tamilName: "கொக்கோ மிட்டாய்",
        slug: "cocoa-mittai",
        description:
          "A modern twist on the classic — peanut candy with a layer of cocoa. A favourite with kids.",
        variants: [
          { label: "200 g", price: r(50), stock: 50 },
          { label: "500 g", price: r(125), stock: 30 },
          { label: "1 kg", price: r(250), stock: 15 },
        ],
      },
      {
        name: "Ellu Mittai",
        tamilName: "எள்ளு மிட்டாய்",
        slug: "ellu-mittai",
        description:
          "Crisp sesame candy bars in jaggery — iron-rich, light and moreish.",
        variants: [
          { label: "200 g", price: r(40), stock: 50 },
          { label: "500 g", price: r(105), stock: 30 },
          { label: "1 kg", price: r(210), stock: 15 },
        ],
      },
      {
        name: "Kadalai Urundai",
        tamilName: "கடலை உருண்டை",
        slug: "kadalai-urundai",
        description:
          "Hand-rolled peanut and jaggery balls — the traditional evening snack of Tamil homes.",
        variants: [
          { label: "200 g", price: r(50), stock: 50 },
          { label: "500 g", price: r(125), stock: 30 },
          { label: "1 kg", price: r(250), stock: 15 },
        ],
      },
      {
        name: "Ellu Urundai",
        tamilName: "எள்ளு உருண்டை",
        slug: "ellu-urundai",
        description:
          "Wholesome sesame and jaggery balls — a healthy traditional treat rich in iron.",
        variants: [
          { label: "200 g", price: r(45), stock: 50 },
          { label: "500 g", price: r(115), stock: 30 },
          { label: "1 kg", price: r(230), stock: 15 },
        ],
      },
      {
        name: "Seeni Mittai",
        tamilName: "சீனி மிட்டாய்",
        slug: "seeni-mittai",
        description: "Old-school sugar candy bars — a nostalgic pettikadai favourite.",
        inactive: true,
        variants: [{ label: "200 g", price: r(45), stock: 0 }],
      },
      {
        name: "Karupatti Mittai",
        tamilName: "கருப்பட்டி மிட்டாய்",
        slug: "karupatti-mittai",
        description: "Palm jaggery candy — deep caramel notes, naturally rich in minerals.",
        inactive: true,
        variants: [{ label: "200 g", price: r(75), stock: 0 }],
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
        variants: [
          { label: "250 g", price: r(50), stock: 60 },
          { label: "500 g", price: r(95), stock: 40 },
          { label: "1 kg", price: r(190), stock: 20 },
        ],
      },
      {
        name: "Seeval",
        tamilName: "சீவல்",
        slug: "seeval",
        description:
          "Thin, crisp seeval ribbons — light, flaky and perfect with evening tea.",
        variants: [
          { label: "250 g", price: r(50), stock: 60 },
          { label: "500 g", price: r(95), stock: 40 },
          { label: "1 kg", price: r(190), stock: 20 },
        ],
      },
      {
        name: "Seeni Sev",
        tamilName: "சீனி சேவு",
        slug: "seeni-sev",
        description:
          "Sweet sev glazed with sugar — a crunchy sweet-and-savoury classic.",
        variants: [
          { label: "250 g", price: r(50), stock: 50 },
          { label: "500 g", price: r(100), stock: 35 },
          { label: "1 kg", price: r(200), stock: 18 },
        ],
      },
      {
        name: "Karupatti Sev",
        tamilName: "கருப்பட்டி சேவு",
        slug: "karupatti-sev",
        description:
          "Sev coated in karupatti (palm jaggery) — an earthy, healthier sweet crunch.",
        variants: [
          { label: "250 g", price: r(50), stock: 50 },
          { label: "500 g", price: r(100), stock: 35 },
          { label: "1 kg", price: r(200), stock: 18 },
        ],
      },
      {
        name: "Pattarai Sev",
        tamilName: "பட்டரை சேவு",
        slug: "pattarai-sev",
        description:
          "Traditional pattarai-style sev — thicker cut, extra crunchy, seasoned the old way.",
        variants: [
          { label: "250 g", price: r(60), stock: 50 },
          { label: "500 g", price: r(115), stock: 35 },
          { label: "1 kg", price: r(230), stock: 18 },
        ],
      },
      {
        name: "Pattarai Seeval",
        tamilName: "பட்டரை சீவல்",
        slug: "pattarai-seeval",
        description:
          "Pattarai-style seeval — hand-cut flakes with a deeper roast and bolder seasoning.",
        variants: [
          { label: "250 g", price: r(60), stock: 50 },
          { label: "500 g", price: r(115), stock: 35 },
          { label: "1 kg", price: r(230), stock: 18 },
        ],
      },
      {
        name: "Kara Seeval",
        tamilName: "கார சீவல்",
        slug: "kara-seeval",
        description:
          "Spicy seeval with chilli and curry leaves — for those who like it hot.",
        variants: [
          { label: "250 g", price: r(60), stock: 50 },
          { label: "500 g", price: r(115), stock: 35 },
          { label: "1 kg", price: r(230), stock: 18 },
        ],
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
        variants: [
          { label: "250 g", price: r(60), stock: 60 },
          { label: "500 g", price: r(115), stock: 40 },
          { label: "1 kg", price: r(230), stock: 20 },
        ],
      },
      {
        name: "Paruvattu Mixture",
        tamilName: "பருவட்டு மிக்சர்",
        slug: "paruvattu-mixture",
        description:
          "Country-style paruvattu mixture with crisp lentil fritter pieces folded through.",
        variants: [
          { label: "250 g", price: r(60), stock: 50 },
          { label: "500 g", price: r(115), stock: 35 },
          { label: "1 kg", price: r(230), stock: 18 },
        ],
      },
      {
        name: "Ragi Mixture",
        tamilName: "ராகி மிக்சர்",
        slug: "ragi-mixture",
        description:
          "Millet-powered mixture made with ragi (finger millet) — the guilt-free crunchy snack.",
        featured: true,
        variants: [
          { label: "250 g", price: r(60), stock: 50 },
          { label: "500 g", price: r(115), stock: 35 },
          { label: "1 kg", price: r(230), stock: 18 },
        ],
      },
      {
        name: "Omapodi Mixture",
        tamilName: "ஓமப்பொடி மிக்சர்",
        slug: "omapodi-mixture",
        description:
          "Fine omapodi (ajwain sev) mixture — delicate strands with a digestive ajwain aroma.",
        variants: [
          { label: "250 g", price: r(65), stock: 50 },
          { label: "500 g", price: r(125), stock: 35 },
          { label: "1 kg", price: r(250), stock: 18 },
        ],
      },
      {
        name: "Butter Murukku",
        tamilName: "பட்டர் முறுக்கு",
        slug: "butter-murukku",
        description:
          "Light, airy and melt-in-the-mouth butter murukku — a softer, richer cousin of the classic.",
        featured: true,
        variants: [
          { label: "250 g", price: r(65), stock: 50 },
          { label: "500 g", price: r(125), stock: 35 },
          { label: "1 kg", price: r(250), stock: 18 },
        ],
      },
      {
        name: "Kara Boondi",
        tamilName: "கார பூந்தி",
        slug: "kara-boondi",
        description:
          "Spicy gram-flour boondi pearls with peanuts and curry leaves — great on its own or over curd rice.",
        variants: [
          { label: "250 g", price: r(60), stock: 50 },
          { label: "500 g", price: r(115), stock: 35 },
          { label: "1 kg", price: r(230), stock: 18 },
        ],
      },
      {
        name: "Kaaram Murukku",
        tamilName: "காரம் முறுக்கு",
        slug: "kaaram-murukku",
        description: "Fiery hand-twisted murukku for those who like real heat.",
        inactive: true,
        variants: [{ label: "250 g", price: r(65), stock: 0 }],
      },
      {
        name: "Manapparai Murukku",
        tamilName: "மணப்பாறை முறுக்கு",
        slug: "manapparai-murukku",
        description: "The famous Manapparai-style murukku — extra crisp, extra moreish.",
        inactive: true,
        variants: [{ label: "250 g", price: r(65), stock: 0 }],
      },
      {
        name: "Ragi Murukku",
        tamilName: "ராகி முறுக்கு",
        slug: "ragi-murukku",
        description: "Finger-millet murukku — the wholesome twist on the classic.",
        inactive: true,
        variants: [{ label: "250 g", price: r(65), stock: 0 }],
      },
      {
        name: "Pudhina Mixture",
        tamilName: "புதினா மிக்சர்",
        slug: "pudhina-mixture",
        description: "Mixture tossed with fresh mint — cool aroma, spicy crunch.",
        inactive: true,
        variants: [{ label: "250 g", price: r(60), stock: 0 }],
      },
    ],
  },
  {
    name: "Halwa",
    tamilName: "அல்வா",
    slug: "halwa",
    products: [
      {
        name: "Wheat Halwa",
        tamilName: "கோதுமை அல்வா",
        slug: "wheat-halwa",
        description:
          "Glossy, ghee-rich wheat halwa slow-cooked the Tirunelveli way.",
        inactive: true,
        variants: [{ label: "250 g", price: r(150), stock: 0 }],
      },
      {
        name: "Carrot Halwa",
        tamilName: "கேரட் அல்வா",
        slug: "carrot-halwa",
        description: "Classic carrot halwa with ghee, milk and cashew.",
        inactive: true,
        variants: [{ label: "250 g", price: r(150), stock: 0 }],
      },
      {
        name: "Karupatti Halwa",
        tamilName: "கருப்பட்டி அல்வா",
        slug: "karupatti-halwa",
        description: "Halwa sweetened with palm jaggery — earthy, deep and rich.",
        inactive: true,
        variants: [{ label: "250 g", price: r(160), stock: 0 }],
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
        featured: true,
        variants: [
          { label: "200 g", price: r(50), stock: 60 },
          { label: "500 g", price: r(125), stock: 40 },
          { label: "1 kg", price: r(250), stock: 20 },
        ],
      },
      {
        name: "Masala Pori Kadalai",
        tamilName: "மசால் பொரி கடலை",
        slug: "masala-pori-kadalai",
        description:
          "Roasted peanuts tossed in a tangy masala — light, protein-rich and addictive.",
        variants: [
          { label: "200 g", price: r(40), stock: 60 },
          { label: "500 g", price: r(100), stock: 40 },
          { label: "1 kg", price: r(200), stock: 20 },
        ],
      },
      {
        name: "Ennai Kadalai",
        tamilName: "எண்ணெய் கடலை",
        slug: "ennai-kadalai",
        description:
          "Golden oil-fried peanuts with salt and a hint of garlic — simple and perfect.",
        variants: [
          { label: "200 g", price: r(50), stock: 60 },
          { label: "500 g", price: r(125), stock: 40 },
          { label: "1 kg", price: r(250), stock: 20 },
        ],
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
        },
      });

      // Attach the photo; replace an old .svg placeholder if one is present
      const firstImage = await prisma.productImage.findFirst({
        where: { productId: product.id },
        orderBy: { sortOrder: "asc" },
      });
      if (!firstImage) {
        await prisma.productImage.create({
          data: { productId: product.id, url: `/products/${p.slug}.webp`, sortOrder: 0 },
        });
      } else if (firstImage.url.endsWith(".svg")) {
        await prisma.productImage.update({
          where: { id: firstImage.id },
          data: { url: `/products/${p.slug}.webp` },
        });
      }

      let vSort = 0;
      for (const v of applyBulkDiscounts(p.variants)) {
        const sku = `${p.slug}-${v.label.replace(/\s+/g, "").toLowerCase()}`;
        await prisma.productVariant.upsert({
          where: { sku },
          update: { price: v.price, mrp: v.mrp ?? null },
          create: {
            productId: product.id,
            label: v.label,
            price: v.price,
            mrp: v.mrp ?? null,
            stock: v.stock,
            sku,
            sortOrder: vSort++,
          },
        });
      }
    }
  }

  const counts = {
    categories: await prisma.category.count(),
    products: await prisma.product.count(),
    variants: await prisma.productVariant.count(),
  };
  console.log("Seeded:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
