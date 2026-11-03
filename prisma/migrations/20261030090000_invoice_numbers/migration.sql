-- AlterTable
ALTER TABLE "Order" ADD COLUMN "invoiceNumber" TEXT;
ALTER TABLE "Order" ADD COLUMN "invoicedAt" DATETIME;

-- CreateTable
CREATE TABLE "InvoiceCounter" (
    "fy" TEXT NOT NULL PRIMARY KEY,
    "last" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Order_invoiceNumber_key" ON "Order"("invoiceNumber");

-- Backfill: number every already-paid order in the order it was placed, per
-- Indian financial year (April to March, in IST = UTC+5:30). Dates are stored
-- as epoch milliseconds.
CREATE TEMP TABLE "_inv" AS
WITH paid AS (
  SELECT o."id", o."createdAt",
         CAST(strftime('%Y', (o."createdAt" + 19800000) / 1000, 'unixepoch') AS INTEGER) AS y,
         CAST(strftime('%m', (o."createdAt" + 19800000) / 1000, 'unixepoch') AS INTEGER) AS m
  FROM "Order" o JOIN "Payment" p ON p."orderId" = o."id"
  WHERE p."status" = 'CAPTURED'
), fy AS (
  SELECT "id", "createdAt",
         printf('%02d-%02d', (CASE WHEN m >= 4 THEN y ELSE y - 1 END) % 100,
                             (CASE WHEN m >= 4 THEN y + 1 ELSE y END) % 100) AS fy
  FROM paid
)
SELECT "id", "createdAt", fy,
       ROW_NUMBER() OVER (PARTITION BY fy ORDER BY "createdAt", "id") AS n
FROM fy;

UPDATE "Order"
SET "invoiceNumber" = (SELECT 'AT/' || fy || '/' || printf('%04d', n) FROM "_inv" WHERE "_inv"."id" = "Order"."id"),
    "invoicedAt"    = "createdAt"
WHERE "id" IN (SELECT "id" FROM "_inv");

INSERT INTO "InvoiceCounter" ("fy", "last")
SELECT fy, MAX(n) FROM "_inv" GROUP BY fy;

DROP TABLE "_inv";
