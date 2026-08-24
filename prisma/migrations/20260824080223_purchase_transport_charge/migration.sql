-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Purchase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "supplier" TEXT NOT NULL,
    "supplierId" TEXT,
    "invoiceNo" TEXT,
    "notes" TEXT,
    "gstRate" REAL NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL,
    "transportCharge" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'UNPAID',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Purchase_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Purchase" ("createdAt", "date", "gstRate", "id", "invoiceNo", "notes", "status", "supplier", "supplierId", "total", "updatedAt") SELECT "createdAt", "date", "gstRate", "id", "invoiceNo", "notes", "status", "supplier", "supplierId", "total", "updatedAt" FROM "Purchase";
DROP TABLE "Purchase";
ALTER TABLE "new_Purchase" RENAME TO "Purchase";
CREATE INDEX "Purchase_supplierId_idx" ON "Purchase"("supplierId");
CREATE INDEX "Purchase_date_idx" ON "Purchase"("date");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
