-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderNumber" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "shipName" TEXT NOT NULL,
    "shipPhone" TEXT NOT NULL,
    "shipLine1" TEXT NOT NULL,
    "shipLine2" TEXT,
    "shipCity" TEXT NOT NULL,
    "shipState" TEXT NOT NULL,
    "shipPincode" TEXT NOT NULL,
    "subtotal" INTEGER NOT NULL,
    "discount" INTEGER NOT NULL DEFAULT 0,
    "shippingFee" INTEGER NOT NULL,
    "manualDiscount" INTEGER NOT NULL DEFAULT 0,
    "discountNote" TEXT,
    "total" INTEGER NOT NULL,
    "packingCost" INTEGER NOT NULL DEFAULT 0,
    "shippingCost" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "couponId" TEXT,
    "couponCode" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Order_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("couponCode", "couponId", "createdAt", "discount", "email", "id", "notes", "orderNumber", "packingCost", "shipCity", "shipLine1", "shipLine2", "shipName", "shipPhone", "shipPincode", "shipState", "shippingCost", "shippingFee", "status", "subtotal", "total", "updatedAt", "userId") SELECT "couponCode", "couponId", "createdAt", "discount", "email", "id", "notes", "orderNumber", "packingCost", "shipCity", "shipLine1", "shipLine2", "shipName", "shipPhone", "shipPincode", "shipState", "shippingCost", "shippingFee", "status", "subtotal", "total", "updatedAt", "userId" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");
CREATE INDEX "Order_userId_idx" ON "Order"("userId");
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");
CREATE INDEX "Order_shipPhone_idx" ON "Order"("shipPhone");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
