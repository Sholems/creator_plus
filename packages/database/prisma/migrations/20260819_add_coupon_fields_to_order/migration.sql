-- AlterTable: Add couponCode and discountAmount to orders
ALTER TABLE "orders" ADD COLUMN "coupon_code" TEXT;
ALTER TABLE "orders" ADD COLUMN "discount_amount" DECIMAL(10, 2);
