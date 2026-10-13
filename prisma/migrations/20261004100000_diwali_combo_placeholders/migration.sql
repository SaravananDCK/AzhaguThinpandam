-- Two placeholder Diwali pre-order combos. Created HIDDEN (isActive = false):
-- the price and contents are not final, so they must not be sellable until the
-- admin fills them in and makes them visible. Safe to re-run.
INSERT INTO "Category" ("id", "name", "slug", "sortOrder", "createdAt", "updatedAt")
SELECT 'cat_diwali_specials', 'Diwali Specials', 'diwali-specials', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "slug" = 'diwali-specials');

INSERT INTO "Product" ("id", "name", "slug", "description", "categoryId", "isActive", "isFeatured", "isFlagship", "madeToOrder", "preorder", "line", "labels", "ratingCount", "createdAt", "updatedAt")
SELECT 'prod_diwali_sweet_combo', 'Diwali Sweet Combo', 'diwali-sweet-combo', 'Placeholder — contents, weight and price to be confirmed before this goes live.', (SELECT "id" FROM "Category" WHERE "slug" = 'diwali-specials'), false, false, false, true, true, 'SNACKS', 'Diwali Special, Pre-order', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "Product" WHERE "slug" = 'diwali-sweet-combo');

INSERT INTO "ProductVariant" ("id", "productId", "label", "price", "stock", "sortOrder", "isActive")
SELECT 'var_diwali_sweet_combo', "id", '1 kg', 49900, 0, 0, true FROM "Product"
WHERE "slug" = 'diwali-sweet-combo' AND NOT EXISTS (SELECT 1 FROM "ProductVariant" v WHERE v."productId" = "Product"."id");

INSERT INTO "Product" ("id", "name", "slug", "description", "categoryId", "isActive", "isFeatured", "isFlagship", "madeToOrder", "preorder", "line", "labels", "ratingCount", "createdAt", "updatedAt")
SELECT 'prod_diwali_karam_combo', 'Diwali Karam Combo', 'diwali-karam-combo', 'Placeholder — contents, weight and price to be confirmed before this goes live.', (SELECT "id" FROM "Category" WHERE "slug" = 'diwali-specials'), false, false, false, true, true, 'SNACKS', 'Diwali Special, Pre-order', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "Product" WHERE "slug" = 'diwali-karam-combo');

INSERT INTO "ProductVariant" ("id", "productId", "label", "price", "stock", "sortOrder", "isActive")
SELECT 'var_diwali_karam_combo', "id", '1 kg', 49900, 0, 0, true FROM "Product"
WHERE "slug" = 'diwali-karam-combo' AND NOT EXISTS (SELECT 1 FROM "ProductVariant" v WHERE v."productId" = "Product"."id");
