// Processes the raw marketing/product photos from Images/ into optimized
// WebP assets under public/. Safe to re-run (overwrites outputs).
// Run: node scripts/process-images.mjs
import { mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "Images", "Karthick Sweets & Snacks");
const pub = join(root, "public");

// slug → source product photo
const PRODUCTS = {
  "kadalai-mittai": "Products/Kadalaimittai-Peanut-Chikki.png",
  "special-kadalai-mittai": "Products/Special-Kadalaimittai.png",
  "karupatti-kadalai-mittai": "Products/Karupatti-Kadalaimittai.png",
  "cocoa-mittai": "Products/Coco-Muttai.png",
  "ellu-mittai": "Products/Ellu-Mittai--300x300.webp",
  "kadalai-urundai": "Products/Kadalai-Urundai--300x300.webp",
  "ellu-urundai": "Products/Ellu-Urundai--300x300.webp",
  sev: "Products/Sevu.png",
  seeval: "Products/Seeval.png",
  "seeni-sev": "Products/Seeni-Sevu.png",
  "karupatti-sev": "Products/Karuppatti-Sevu.png",
  "pattarai-sev": "Products/Pattarai-Sevu.png",
  "pattarai-seeval": "Products/Pattarai-Seeval.png",
  "kara-seeval": "Products/Kaara-Seeval-300x300.png",
  mixture: "Products/Mixture.png",
  "paruvattu-mixture": "Products/Paruvattu-Mixture.png",
  "ragi-mixture": "Products/Ragi-Mixture.png",
  "omapodi-mixture": "Products/Kaaram-Omapondi.webp",
  "butter-murukku": "Products/Butter-Murukku.png",
  "kara-boondi": "Products/Kara-Boondi-300x300.webp",
  "masala-kadalai": "Products/Masala-Kadalai.webp",
  "masala-pori-kadalai": "Products/Masala-Pori-Kadalai-300x300.webp",
  "ennai-kadalai": "Products/Oil-Kadalai.webp",
  // New products (not on the price list yet — seeded inactive)
  "carrot-halwa": "Products/Carrot-Halwa.webp",
  "karupatti-halwa": "Products/Karuppati-Halwa.webp",
  "wheat-halwa": "Products/Wheat-Halwa.webp",
  "kaaram-murukku": "Products/Kaaram-Murukku.webp",
  "manapparai-murukku": "Products/Manappaarai-Murukku.webp",
  "ragi-murukku": "Products/Raagi-Murukku.webp",
  "pudhina-mixture": "Products/Pudhina-Mixture.webp",
  "seeni-mittai": "Products/Seeni-Mittai.webp",
  "karupatti-mittai": "Products/Karupatti-Mittai.webp",
};

// category slug → source (content sits at the bottom of these wide shots)
const CATEGORIES = {
  "mittai-urundai": "Categories/Categories 5.jpeg",
  "sev-seeval": "Categories/Categories 6.png",
  "mixture-murukku": "Categories/Categories 3.jpeg",
  "kadalai-snacks": "Products/Masala-Kadalai.webp",
  halwa: "Categories/Categories 4.jpeg",
};

const BANNERS = {
  "hero.webp": "Banner/Banner 3.png",
  "banner-pack.webp": "Banner/Banner 1.jpg",
  "banner-family.webp": "Banner/Banner 2 .jpg",
  "cta.webp": "CTA/CTA 1.png",
};

const SHOWCASE = [
  "ShowCase/ShowCase1.png",
  "ShowCase/ShowCase2.png",
  "ShowCase/ShowCase3.png",
  "ShowCase/ShowCase 4.png",
  "ShowCase/ShowCase 5.png",
  "ShowCase/Showcase 6.png",
];

mkdirSync(join(pub, "products"), { recursive: true });
mkdirSync(join(pub, "banners"), { recursive: true });
mkdirSync(join(pub, "showcase"), { recursive: true });

let count = 0;

for (const [slug, rel] of Object.entries(PRODUCTS)) {
  await sharp(join(src, rel))
    .resize(1000, 1000, { fit: "cover", position: "attention" })
    .webp({ quality: 84 })
    .toFile(join(pub, "products", `${slug}.webp`));
  count++;
}

for (const [slug, rel] of Object.entries(CATEGORIES)) {
  await sharp(join(src, rel))
    .resize(1200, 900, { fit: "cover", position: "south" })
    .webp({ quality: 80 })
    .toFile(join(pub, "products", `cat-${slug}.webp`));
  count++;
}

for (const [out, rel] of Object.entries(BANNERS)) {
  await sharp(join(src, rel))
    .resize({ width: 1920, withoutEnlargement: true })
    .webp({ quality: 78 })
    .toFile(join(pub, "banners", out));
  count++;
}

for (let i = 0; i < SHOWCASE.length; i++) {
  await sharp(join(src, SHOWCASE[i]))
    .resize(900, 900, { fit: "cover", position: "attention" })
    .webp({ quality: 80 })
    .toFile(join(pub, "showcase", `showcase-${i + 1}.webp`));
  count++;
}

console.log(`Processed ${count} images into public/`);
