-- CreateEnum
CREATE TYPE "QrOfferCode" AS ENUM ('SINGLE', 'PACK', 'PRO_MONTHLY', 'PRO_YEARLY');
CREATE TYPE "QrPaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED');
CREATE TYPE "QrEntitlementStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'EXHAUSTED', 'REVOKED');
CREATE TYPE "QrEntitlementKind" AS ENUM ('CAMPAIGN_CREDIT', 'PRO_PASS');
CREATE TYPE "QrCampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'EXPIRED', 'ARCHIVED');
CREATE TYPE "QrContentType" AS ENUM ('FILE', 'IMAGE_GALLERY', 'WEBSITE', 'PRODUCT_PAGE', 'CREATOR_PROFILE', 'WHATSAPP', 'SOCIAL_LINK_HUB', 'TEXT_NOTE');
CREATE TYPE "QrScanMode" AS ENUM ('LANDING_PAGE', 'DIRECT_OPEN');
CREATE TYPE "QrAssetKind" AS ENUM ('CAMPAIGN_FILE', 'BRAND_LOGO', 'GALLERY_IMAGE');
CREATE TYPE "QrAssetSafetyStatus" AS ENUM ('PENDING_SCAN', 'APPROVED', 'BLOCKED');
CREATE TYPE "QrEventKind" AS ENUM ('SCAN', 'OPEN');

-- CreateTable
CREATE TABLE "qr_payments" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "offer_code" "QrOfferCode" NOT NULL,
    "offer_name" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "campaign_credits" INTEGER NOT NULL DEFAULT 0,
    "max_active_campaigns" INTEGER,
    "access_starts_at" TIMESTAMP(3),
    "access_ends_at" TIMESTAMP(3),
    "status" "QrPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "provider" TEXT NOT NULL DEFAULT 'paystack',
    "provider_payment_id" TEXT,
    "provider_reference" TEXT NOT NULL,
    "provider_response" JSONB,
    "fulfilled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "qr_payments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "qr_entitlements" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "payment_id" UUID,
    "offer_code" "QrOfferCode" NOT NULL,
    "kind" "QrEntitlementKind" NOT NULL,
    "status" "QrEntitlementStatus" NOT NULL DEFAULT 'ACTIVE',
    "campaign_credits_total" INTEGER NOT NULL DEFAULT 0,
    "campaign_credits_used" INTEGER NOT NULL DEFAULT 0,
    "max_active_campaigns" INTEGER,
    "starts_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "qr_entitlements_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "qr_campaigns" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "entitlement_id" UUID,
    "public_code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "content_type" "QrContentType" NOT NULL,
    "status" "QrCampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "scan_mode" "QrScanMode" NOT NULL DEFAULT 'LANDING_PAGE',
    "destination_url" TEXT,
    "destination_data" JSONB,
    "brand_name" TEXT,
    "brand_logo_asset_id" UUID,
    "brand_primary_color" TEXT,
    "brand_accent_color" TEXT,
    "design_settings" JSONB,
    "activated_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "qr_campaigns_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "qr_assets" (
    "id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "kind" "QrAssetKind" NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_key" TEXT NOT NULL,
    "file_size" BIGINT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "checksum" TEXT,
    "safety_status" "QrAssetSafetyStatus" NOT NULL DEFAULT 'PENDING_SCAN',
    "safety_reason" TEXT,
    "scanner_metadata" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "qr_assets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "qr_scan_events" (
    "id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "kind" "QrEventKind" NOT NULL,
    "request_hash" TEXT,
    "referrer_origin" TEXT,
    "user_agent_family" TEXT,
    "device_class" TEXT,
    "country" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "qr_scan_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "qr_admin_actions" (
    "id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "actor_id" UUID,
    "action" TEXT NOT NULL,
    "reason_code" TEXT NOT NULL,
    "reason" TEXT,
    "previous_state" JSONB,
    "new_state" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "qr_admin_actions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "qr_payments_provider_reference_key" ON "qr_payments"("provider_reference");
CREATE INDEX "qr_payments_user_id_idx" ON "qr_payments"("user_id");
CREATE INDEX "qr_payments_offer_code_idx" ON "qr_payments"("offer_code");
CREATE INDEX "qr_payments_status_idx" ON "qr_payments"("status");
CREATE INDEX "qr_payments_created_at_idx" ON "qr_payments"("created_at");

CREATE INDEX "qr_entitlements_user_id_status_idx" ON "qr_entitlements"("user_id", "status");
CREATE INDEX "qr_entitlements_offer_code_idx" ON "qr_entitlements"("offer_code");
CREATE INDEX "qr_entitlements_expires_at_idx" ON "qr_entitlements"("expires_at");

CREATE UNIQUE INDEX "qr_campaigns_public_code_key" ON "qr_campaigns"("public_code");
CREATE INDEX "qr_campaigns_owner_id_status_idx" ON "qr_campaigns"("owner_id", "status");
CREATE INDEX "qr_campaigns_entitlement_id_idx" ON "qr_campaigns"("entitlement_id");
CREATE INDEX "qr_campaigns_content_type_idx" ON "qr_campaigns"("content_type");
CREATE INDEX "qr_campaigns_expires_at_idx" ON "qr_campaigns"("expires_at");

CREATE INDEX "qr_assets_campaign_id_kind_active_idx" ON "qr_assets"("campaign_id", "kind", "active");
CREATE INDEX "qr_assets_safety_status_idx" ON "qr_assets"("safety_status");

CREATE INDEX "qr_scan_events_campaign_id_kind_created_at_idx" ON "qr_scan_events"("campaign_id", "kind", "created_at");
CREATE INDEX "qr_scan_events_created_at_idx" ON "qr_scan_events"("created_at");

CREATE INDEX "qr_admin_actions_campaign_id_idx" ON "qr_admin_actions"("campaign_id");
CREATE INDEX "qr_admin_actions_actor_id_idx" ON "qr_admin_actions"("actor_id");
CREATE INDEX "qr_admin_actions_created_at_idx" ON "qr_admin_actions"("created_at");

-- AddForeignKey
ALTER TABLE "qr_payments" ADD CONSTRAINT "qr_payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "qr_entitlements" ADD CONSTRAINT "qr_entitlements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "qr_entitlements" ADD CONSTRAINT "qr_entitlements_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "qr_payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "qr_campaigns" ADD CONSTRAINT "qr_campaigns_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "qr_campaigns" ADD CONSTRAINT "qr_campaigns_entitlement_id_fkey" FOREIGN KEY ("entitlement_id") REFERENCES "qr_entitlements"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "qr_assets" ADD CONSTRAINT "qr_assets_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "qr_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "qr_scan_events" ADD CONSTRAINT "qr_scan_events_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "qr_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "qr_admin_actions" ADD CONSTRAINT "qr_admin_actions_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "qr_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "qr_admin_actions" ADD CONSTRAINT "qr_admin_actions_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
