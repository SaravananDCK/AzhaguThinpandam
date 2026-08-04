-- AlterTable
ALTER TABLE "ProductVariant" ADD COLUMN "unitCost" INTEGER;
ALTER TABLE "ProductVariant" ADD COLUMN "weightGrams" INTEGER;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "tamilName" TEXT,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isFlagship" BOOLEAN NOT NULL DEFAULT false,
    "line" TEXT NOT NULL DEFAULT 'SNACKS',
    "purchasePricePerKg" INTEGER,
    "profitMarginPct" REAL,
    "gstRate" REAL,
    "ratingAvg" REAL,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Product" ("categoryId", "createdAt", "description", "gstRate", "id", "isActive", "isFeatured", "isFlagship", "name", "profitMarginPct", "purchasePricePerKg", "ratingAvg", "ratingCount", "slug", "tamilName", "updatedAt") SELECT "categoryId", "createdAt", "description", "gstRate", "id", "isActive", "isFeatured", "isFlagship", "name", "profitMarginPct", "purchasePricePerKg", "ratingAvg", "ratingCount", "slug", "tamilName", "updatedAt" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
