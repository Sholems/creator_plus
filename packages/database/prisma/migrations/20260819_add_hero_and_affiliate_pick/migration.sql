-- AlterTable
ALTER TABLE "products" ADD COLUMN "is_hero_product" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "is_affiliate_pick" BOOLEAN NOT NULL DEFAULT false;
