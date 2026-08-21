-- CreateEnum
CREATE TYPE "LicenseStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'REVOKED');

-- AlterTable: per-product licensing config
ALTER TABLE "products" ADD COLUMN "license_keys_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "products" ADD COLUMN "license_max_activations" INTEGER NOT NULL DEFAULT 2;
ALTER TABLE "products" ADD COLUMN "license_validity_days" INTEGER;

-- CreateTable
CREATE TABLE "license_keys" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "product_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "order_item_id" UUID,
    "buyer_id" UUID NOT NULL,
    "max_activations" INTEGER NOT NULL DEFAULT 2,
    "status" "LicenseStatus" NOT NULL DEFAULT 'ACTIVE',
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "license_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "license_activations" (
    "id" UUID NOT NULL,
    "license_key_id" UUID NOT NULL,
    "device_id" TEXT NOT NULL,
    "device_name" TEXT,
    "ip_address" TEXT,
    "activated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "license_activations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "license_keys_key_key" ON "license_keys"("key");
CREATE INDEX "license_keys_buyer_id_idx" ON "license_keys"("buyer_id");
CREATE INDEX "license_keys_product_id_idx" ON "license_keys"("product_id");
CREATE INDEX "license_keys_order_id_idx" ON "license_keys"("order_id");
CREATE INDEX "license_activations_license_key_id_idx" ON "license_activations"("license_key_id");
CREATE UNIQUE INDEX "license_activations_license_key_id_device_id_key" ON "license_activations"("license_key_id", "device_id");

-- AddForeignKey
ALTER TABLE "license_keys" ADD CONSTRAINT "license_keys_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "license_keys" ADD CONSTRAINT "license_keys_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "license_keys" ADD CONSTRAINT "license_keys_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "license_activations" ADD CONSTRAINT "license_activations_license_key_id_fkey" FOREIGN KEY ("license_key_id") REFERENCES "license_keys"("id") ON DELETE CASCADE ON UPDATE CASCADE;
