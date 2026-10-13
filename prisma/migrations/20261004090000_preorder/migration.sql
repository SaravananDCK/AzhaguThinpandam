-- AlterTable
ALTER TABLE "Product" ADD COLUMN "preorder" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "preorder" BOOLEAN NOT NULL DEFAULT false;
