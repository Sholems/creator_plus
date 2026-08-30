-- CreateEnum
CREATE TYPE "QrCouponType" AS ENUM ('PERCENTAGE', 'FIXED');

-- AlterTable
ALTER TABLE "qr_payments" ADD COLUMN "coupon_code" TEXT;
ALTER TABLE "qr_payments" ADD COLUMN "coupon_id" UUID;
ALTER TABLE "qr_payments" ADD COLUMN "discount_amount" DECIMAL(10,2);

-- CreateTable
CREATE TABLE "qr_coupons" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "type" "QrCouponType" NOT NULL,
    "value" DECIMAL(10,2) NOT NULL,
    "applies_to_offers" "QrOfferCode"[] DEFAULT ARRAY[]::"QrOfferCode"[],
    "max_redemptions" INTEGER,
    "redeemed_count" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "starts_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "qr_coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qr_coupon_redemptions" (
    "id" UUID NOT NULL,
    "coupon_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "payment_id" UUID,
    "offer_code" "QrOfferCode" NOT NULL,
    "discount" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "qr_coupon_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "qr_coupons_code_key" ON "qr_coupons"("code");
CREATE INDEX "qr_coupons_is_active_idx" ON "qr_coupons"("is_active");
CREATE INDEX "qr_coupon_redemptions_coupon_id_idx" ON "qr_coupon_redemptions"("coupon_id");
CREATE INDEX "qr_coupon_redemptions_user_id_idx" ON "qr_coupon_redemptions"("user_id");

-- AddForeignKey
ALTER TABLE "qr_coupon_redemptions" ADD CONSTRAINT "qr_coupon_redemptions_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "qr_coupons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
