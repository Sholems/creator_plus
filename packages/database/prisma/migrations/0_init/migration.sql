-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ProductAffiliateStatus" AS ENUM ('DISABLED', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "LicenseType" AS ENUM ('PERSONAL', 'COMMERCIAL', 'EXTENDED', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PROCESSING', 'PAID', 'FULFILLED', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "AcquisitionSource" AS ENUM ('CREATOR_DIRECT', 'AFFILIATE', 'MARKETPLACE_ORGANIC', 'PLATFORM_CAMPAIGN', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('SALE', 'COMMISSION', 'PAYOUT', 'REFUND', 'CHARGEBACK', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE');

-- CreateEnum
CREATE TYPE "CommissionStatus" AS ENUM ('PENDING', 'APPROVED', 'PAYABLE', 'PAID', 'REVERSED', 'REJECTED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "AffiliateStatus" AS ENUM ('PENDING', 'ACTIVE', 'REJECTED', 'SUSPENDED', 'BANNED');

-- CreateEnum
CREATE TYPE "AffiliateLinkStatus" AS ENUM ('ACTIVE', 'DISABLED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ConversionStatus" AS ENUM ('PENDING', 'APPROVED', 'PAYABLE', 'PAID', 'REVERSED', 'REJECTED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "AffiliatePayoutStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "CouponType" AS ENUM ('PERCENTAGE', 'FIXED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('SALE', 'PRODUCT_APPROVED', 'PRODUCT_REJECTED', 'NEW_REVIEW', 'REFUND_REQUEST', 'PAYOUT_COMPLETED', 'VERIFICATION_STATUS', 'AFFILIATE_APPLICATION', 'AFFILIATE_APPROVED', 'AFFILIATE_REJECTED', 'AFFILIATE_COMMISSION', 'AFFILIATE_PAYOUT', 'PRODUCT_AFFILIATE_APPROVED', 'PRODUCT_AFFILIATE_REJECTED', 'SYSTEM');

-- CreateEnum
CREATE TYPE "TicketCategory" AS ENUM ('TECHNICAL', 'BILLING', 'DOWNLOADS', 'REFUNDS', 'ACCOUNT', 'CREATOR_VERIFICATION', 'ABUSE_REPORT');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "ContactMessageStatus" AS ENUM ('NEW', 'READ', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PlanTier" AS ENUM ('FREE', 'STARTER', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELED', 'PAUSED');

-- CreateEnum
CREATE TYPE "CreditPurchaseStatus" AS ENUM ('COMPLETED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "CreditTransactionType" AS ENUM ('PURCHASE', 'USAGE', 'REFUND', 'BONUS', 'EXPIRY');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "display_name" TEXT,
    "avatar" TEXT,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
    "two_factor_secret" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "bio" TEXT,
    "phone" TEXT,
    "country" TEXT,
    "city" TEXT,
    "website" TEXT,
    "social_links" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "user_agent" TEXT,
    "ip_address" TEXT,
    "country" TEXT,
    "last_activity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "permissions" JSONB,
    "last_used_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creator_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "store_name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "bio" TEXT,
    "avatar" TEXT,
    "banner" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verification_status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "social_links" JSONB,
    "commission_rate" DECIMAL(5,2),
    "holding_period_days" INTEGER NOT NULL DEFAULT 14,
    "stripe_account_id" TEXT,
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "creator_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creator_verifications" (
    "id" UUID NOT NULL,
    "creator_id" UUID NOT NULL,
    "identity_type" TEXT NOT NULL,
    "identity_number" TEXT NOT NULL,
    "identity_document" TEXT NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "creator_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creator_bank_accounts" (
    "id" UUID NOT NULL,
    "creator_id" UUID NOT NULL,
    "bank_name" TEXT NOT NULL,
    "account_number" TEXT NOT NULL,
    "account_name" TEXT NOT NULL,
    "swift_code" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "creator_bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creator_followers" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "creator_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "creator_followers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "image" TEXT,
    "parent_id" UUID,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collections" (
    "id" UUID NOT NULL,
    "creator_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "creator_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "short_description" TEXT,
    "status" "ProductStatus" NOT NULL DEFAULT 'DRAFT',
    "cover_image" TEXT,
    "thumbnail" TEXT,
    "preview_images" TEXT[],
    "price" DECIMAL(10,2) NOT NULL,
    "compare_at_price" DECIMAL(10,2),
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "license_type" "LicenseType" NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "file_size" BIGINT NOT NULL DEFAULT 0,
    "download_count" INTEGER NOT NULL DEFAULT 0,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "rating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "average_rating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "review_count" INTEGER NOT NULL DEFAULT 0,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMP(3),
    "affiliate_enabled" BOOLEAN NOT NULL DEFAULT false,
    "affiliate_status" "ProductAffiliateStatus" NOT NULL DEFAULT 'DISABLED',
    "affiliate_commission_type" TEXT NOT NULL DEFAULT 'RATE',
    "affiliate_commission_rate" INTEGER,
    "affiliate_approved_at" TIMESTAMP(3),
    "affiliate_approved_by" UUID,
    "affiliate_rejection_reason" TEXT,
    "affiliate_click_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_tags" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,

    CONSTRAINT "product_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_files" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "version_id" UUID,
    "file_name" TEXT NOT NULL,
    "file_key" TEXT NOT NULL,
    "file_size" BIGINT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "checksum" TEXT,
    "storage_provider" TEXT NOT NULL DEFAULT 'r2',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_versions" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "version_number" TEXT NOT NULL,
    "release_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_by" UUID,

    CONSTRAINT "product_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collection_products" (
    "id" UUID NOT NULL,
    "collection_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collection_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carts" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "session_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_items" (
    "id" UUID NOT NULL,
    "cart_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "license_type" "LicenseType" NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "buyer_id" UUID NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "total_amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "invoice_number" TEXT NOT NULL,
    "payment_id" UUID,
    "idempotency_key" TEXT,
    "notes" TEXT,
    "acquisition_source" "AcquisitionSource" NOT NULL DEFAULT 'UNKNOWN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "product_name" TEXT NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "total_price" DECIMAL(10,2) NOT NULL,
    "license_type" "LicenseType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "provider" TEXT NOT NULL,
    "provider_payment_id" TEXT,
    "provider_response" JSONB,
    "stripe_session_id" TEXT,
    "stripe_payment_intent_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refunds" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
    "provider_refund_id" TEXT,
    "approved_by" UUID,
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "downloads" (
    "id" UUID NOT NULL,
    "order_item_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "download_count" INTEGER NOT NULL DEFAULT 0,
    "max_downloads" INTEGER NOT NULL DEFAULT 10,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "downloads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "download_logs" (
    "id" UUID NOT NULL,
    "download_id" UUID NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "device" TEXT,
    "country" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "download_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "buyer_id" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "comment" TEXT,
    "helpful" INTEGER NOT NULL DEFAULT 0,
    "helpful_count" INTEGER NOT NULL DEFAULT 0,
    "reported" BOOLEAN NOT NULL DEFAULT false,
    "reported_reason" TEXT,
    "reported_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_helpful_votes" (
    "id" UUID NOT NULL,
    "review_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_helpful_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "pending_balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "available_balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "reserved_balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "lifetime_earnings" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "lifetime_payouts" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_transactions" (
    "id" UUID NOT NULL,
    "wallet_id" UUID NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "balance_before" DECIMAL(12,2) NOT NULL,
    "balance_after" DECIMAL(12,2) NOT NULL,
    "description" TEXT,
    "reference_type" TEXT,
    "reference_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_accounts" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AccountType" NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_entries" (
    "id" UUID NOT NULL,
    "transaction_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "debit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "credit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_transactions" (
    "id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "reference" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commissions" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "order_item_id" UUID NOT NULL,
    "creator_id" UUID NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "rate" DECIMAL(5,2) NOT NULL,
    "status" "CommissionStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payout_requests" (
    "id" UUID NOT NULL,
    "wallet_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "creator_id" UUID,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "method" TEXT,
    "bank_account_id" UUID,
    "approved_by" UUID,
    "approved_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "reference" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payout_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payouts" (
    "id" UUID NOT NULL,
    "creator_id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "method" TEXT,
    "reference" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliates" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "status" "AffiliateStatus" NOT NULL DEFAULT 'PENDING',
    "application_message" TEXT,
    "promotion_channels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "website_url" TEXT,
    "social_media_links" JSONB,
    "country" TEXT,
    "payment_method" TEXT,
    "payment_details" JSONB,
    "approved_at" TIMESTAMP(3),
    "approved_by" UUID,
    "rejected_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "suspended_at" TIMESTAMP(3),
    "suspension_reason" TEXT,
    "total_clicks" INTEGER NOT NULL DEFAULT 0,
    "total_conversions" INTEGER NOT NULL DEFAULT 0,
    "total_earnings" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affiliates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliate_links" (
    "id" UUID NOT NULL,
    "affiliate_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "destination_url" TEXT,
    "status" "AffiliateLinkStatus" NOT NULL DEFAULT 'ACTIVE',
    "click_count" INTEGER NOT NULL DEFAULT 0,
    "conversion_count" INTEGER NOT NULL DEFAULT 0,
    "gross_sales" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "commission_earned" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affiliate_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliate_clicks" (
    "id" UUID NOT NULL,
    "affiliate_id" UUID NOT NULL,
    "link_id" UUID NOT NULL,
    "product_id" UUID,
    "visitor_id" TEXT,
    "session_id" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "referer" TEXT,
    "country" TEXT,
    "landing_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "affiliate_clicks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliate_attributions" (
    "id" UUID NOT NULL,
    "affiliate_id" UUID NOT NULL,
    "link_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "visitor_id" TEXT,
    "session_id" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "clicked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "converted_at" TIMESTAMP(3),
    "order_id" UUID,

    CONSTRAINT "affiliate_attributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliate_conversions" (
    "id" UUID NOT NULL,
    "affiliate_id" UUID NOT NULL,
    "link_id" UUID,
    "order_id" UUID NOT NULL,
    "order_item_id" UUID NOT NULL,
    "order_amount" DECIMAL(10,2) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "rate" DECIMAL(5,2) NOT NULL DEFAULT 20,
    "creator_amount" DECIMAL(10,2) NOT NULL,
    "platform_amount" DECIMAL(10,2) NOT NULL,
    "status" "ConversionStatus" NOT NULL DEFAULT 'PENDING',
    "held_until" TIMESTAMP(3),
    "released_at" TIMESTAMP(3),
    "payable_at" TIMESTAMP(3),
    "reversal_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "reversed_at" TIMESTAMP(3),
    "reversal_reason" TEXT,
    "approved_by" UUID,
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "affiliate_conversions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commission_ledger" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "order_item_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "order_amount" DECIMAL(10,2) NOT NULL,
    "discount_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "paid_amount" DECIMAL(10,2) NOT NULL,
    "platform_rate" DECIMAL(5,2) NOT NULL,
    "platform_amount" DECIMAL(10,2) NOT NULL,
    "affiliate_id" UUID,
    "affiliate_rate" DECIMAL(5,2),
    "affiliate_amount" DECIMAL(10,2),
    "creator_id" UUID NOT NULL,
    "creator_rate" DECIMAL(5,2) NOT NULL,
    "creator_amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "acquisition_source" "AcquisitionSource" NOT NULL DEFAULT 'UNKNOWN',
    "gateway_provider" TEXT,
    "gateway_fee" DECIMAL(10,2),
    "gateway_currency" TEXT,
    "gateway_reference" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commission_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliate_payouts" (
    "id" UUID NOT NULL,
    "affiliate_id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "status" "AffiliatePayoutStatus" NOT NULL DEFAULT 'PENDING',
    "method" TEXT,
    "bank_details" JSONB,
    "reference" TEXT,
    "notes" TEXT,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_by" UUID,
    "approved_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affiliate_payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliate_payout_items" (
    "id" UUID NOT NULL,
    "payout_id" UUID NOT NULL,
    "conversion_id" UUID NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "affiliate_payout_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliate_promotional_assets" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'BANNER',
    "title" TEXT,
    "description" TEXT,
    "file_key" TEXT,
    "file_url" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "affiliate_promotional_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliate_fraud_flags" (
    "id" UUID NOT NULL,
    "affiliate_id" UUID NOT NULL,
    "conversion_id" UUID,
    "order_id" UUID,
    "type" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "created_by" UUID,
    "resolved_by" UUID,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "affiliate_fraud_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupons" (
    "id" UUID NOT NULL,
    "creator_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "type" "CouponType" NOT NULL,
    "value" DECIMAL(10,2) NOT NULL,
    "min_purchase" DECIMAL(10,2),
    "max_uses" INTEGER,
    "used_count" INTEGER NOT NULL DEFAULT 0,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupon_redemptions" (
    "id" UUID NOT NULL,
    "coupon_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupon_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wishlists" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Default',
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wishlists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wishlist_items" (
    "id" UUID NOT NULL,
    "wishlist_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wishlist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actor_id" UUID,
    "actor_email" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resource_id" UUID,
    "previous_state" JSONB,
    "new_state" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_tickets" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "TicketCategory" NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "TicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "assigned_to" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_messages" (
    "id" UUID NOT NULL,
    "ticket_id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "group" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_flags" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_enabled" BOOLEAN NOT NULL DEFAULT false,
    "rollout_percentage" INTEGER NOT NULL DEFAULT 100,
    "environment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_messages" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "ContactMessageStatus" NOT NULL DEFAULT 'NEW',
    "user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "tier" "PlanTier" NOT NULL DEFAULT 'FREE',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "stripe_customer_id" TEXT,
    "stripe_subscription_id" TEXT,
    "stripe_price_id" TEXT,
    "current_period_start" TIMESTAMP(3),
    "current_period_end" TIMESTAMP(3),
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_packs" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,
    "price_in_cents" INTEGER NOT NULL,
    "stripe_price_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credit_packs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_purchases" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "credit_pack_id" UUID NOT NULL,
    "subscription_id" UUID,
    "credits" INTEGER NOT NULL,
    "amount_paid_in_cents" INTEGER NOT NULL,
    "stripe_payment_intent_id" TEXT,
    "status" "CreditPurchaseStatus" NOT NULL DEFAULT 'COMPLETED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_balances" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "total_credits" INTEGER NOT NULL DEFAULT 0,
    "used_credits" INTEGER NOT NULL DEFAULT 0,
    "last_top_up_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credit_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_transactions" (
    "id" UUID NOT NULL,
    "balance_id" UUID NOT NULL,
    "type" "CreditTransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "description" TEXT,
    "reference_type" TEXT,
    "reference_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_records" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "credits_used" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_PermissionToRole" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_PermissionToRole_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_user_id_key" ON "user_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_name_key" ON "permissions"("name");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_user_id_role_id_key" ON "user_roles"("user_id", "role_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE UNIQUE INDEX "api_tokens_token_key" ON "api_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "creator_profiles_user_id_key" ON "creator_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "creator_profiles_slug_key" ON "creator_profiles"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "creator_verifications_creator_id_key" ON "creator_verifications"("creator_id");

-- CreateIndex
CREATE UNIQUE INDEX "creator_followers_user_id_creator_id_key" ON "creator_followers"("user_id", "creator_id");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tags_name_key" ON "tags"("name");

-- CreateIndex
CREATE UNIQUE INDEX "tags_slug_key" ON "tags"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "collections_creator_id_slug_key" ON "collections"("creator_id", "slug");

-- CreateIndex
CREATE INDEX "products_category_id_idx" ON "products"("category_id");

-- CreateIndex
CREATE INDEX "products_status_idx" ON "products"("status");

-- CreateIndex
CREATE INDEX "products_published_at_idx" ON "products"("published_at");

-- CreateIndex
CREATE INDEX "products_rating_idx" ON "products"("rating");

-- CreateIndex
CREATE INDEX "products_created_at_idx" ON "products"("created_at");

-- CreateIndex
CREATE INDEX "products_status_created_at_idx" ON "products"("status", "created_at");

-- CreateIndex
CREATE INDEX "products_creator_id_status_idx" ON "products"("creator_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "products_creator_id_slug_key" ON "products"("creator_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "product_tags_product_id_tag_id_key" ON "product_tags"("product_id", "tag_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_versions_product_id_version_number_key" ON "product_versions"("product_id", "version_number");

-- CreateIndex
CREATE UNIQUE INDEX "collection_products_collection_id_product_id_key" ON "collection_products"("collection_id", "product_id");

-- CreateIndex
CREATE UNIQUE INDEX "carts_user_id_key" ON "carts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "cart_items_cart_id_product_id_key" ON "cart_items"("cart_id", "product_id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_invoice_number_key" ON "orders"("invoice_number");

-- CreateIndex
CREATE UNIQUE INDEX "orders_idempotency_key_key" ON "orders"("idempotency_key");

-- CreateIndex
CREATE INDEX "orders_buyer_id_idx" ON "orders"("buyer_id");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "orders_created_at_idx" ON "orders"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "payments_order_id_key" ON "payments"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_stripe_session_id_key" ON "payments"("stripe_session_id");

-- CreateIndex
CREATE UNIQUE INDEX "downloads_order_item_id_key" ON "downloads"("order_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "downloads_token_key" ON "downloads"("token");

-- CreateIndex
CREATE INDEX "reviews_product_id_idx" ON "reviews"("product_id");

-- CreateIndex
CREATE INDEX "reviews_rating_idx" ON "reviews"("rating");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_product_id_buyer_id_key" ON "reviews"("product_id", "buyer_id");

-- CreateIndex
CREATE UNIQUE INDEX "review_helpful_votes_review_id_user_id_key" ON "review_helpful_votes"("review_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_user_id_key" ON "wallets"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "ledger_accounts_code_key" ON "ledger_accounts"("code");

-- CreateIndex
CREATE UNIQUE INDEX "commissions_order_item_id_key" ON "commissions"("order_item_id");

-- CreateIndex
CREATE INDEX "payouts_creator_id_idx" ON "payouts"("creator_id");

-- CreateIndex
CREATE INDEX "payouts_status_idx" ON "payouts"("status");

-- CreateIndex
CREATE UNIQUE INDEX "affiliates_user_id_key" ON "affiliates"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "affiliates_code_key" ON "affiliates"("code");

-- CreateIndex
CREATE INDEX "affiliates_status_idx" ON "affiliates"("status");

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_links_code_key" ON "affiliate_links"("code");

-- CreateIndex
CREATE INDEX "affiliate_links_affiliate_id_idx" ON "affiliate_links"("affiliate_id");

-- CreateIndex
CREATE INDEX "affiliate_links_product_id_idx" ON "affiliate_links"("product_id");

-- CreateIndex
CREATE INDEX "affiliate_clicks_link_id_idx" ON "affiliate_clicks"("link_id");

-- CreateIndex
CREATE INDEX "affiliate_clicks_affiliate_id_idx" ON "affiliate_clicks"("affiliate_id");

-- CreateIndex
CREATE INDEX "affiliate_clicks_product_id_idx" ON "affiliate_clicks"("product_id");

-- CreateIndex
CREATE INDEX "affiliate_clicks_visitor_id_idx" ON "affiliate_clicks"("visitor_id");

-- CreateIndex
CREATE INDEX "affiliate_attributions_affiliate_id_idx" ON "affiliate_attributions"("affiliate_id");

-- CreateIndex
CREATE INDEX "affiliate_attributions_order_id_idx" ON "affiliate_attributions"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_attributions_visitor_id_product_id_key" ON "affiliate_attributions"("visitor_id", "product_id");

-- CreateIndex
CREATE INDEX "affiliate_conversions_affiliate_id_status_idx" ON "affiliate_conversions"("affiliate_id", "status");

-- CreateIndex
CREATE INDEX "affiliate_conversions_order_id_idx" ON "affiliate_conversions"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_conversions_order_item_id_key" ON "affiliate_conversions"("order_item_id");

-- CreateIndex
CREATE INDEX "commission_ledger_order_id_idx" ON "commission_ledger"("order_id");

-- CreateIndex
CREATE INDEX "commission_ledger_affiliate_id_idx" ON "commission_ledger"("affiliate_id");

-- CreateIndex
CREATE INDEX "commission_ledger_creator_id_idx" ON "commission_ledger"("creator_id");

-- CreateIndex
CREATE INDEX "commission_ledger_product_id_idx" ON "commission_ledger"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "commission_ledger_order_item_id_key" ON "commission_ledger"("order_item_id");

-- CreateIndex
CREATE INDEX "affiliate_payouts_affiliate_id_idx" ON "affiliate_payouts"("affiliate_id");

-- CreateIndex
CREATE INDEX "affiliate_payouts_status_idx" ON "affiliate_payouts"("status");

-- CreateIndex
CREATE INDEX "affiliate_payout_items_conversion_id_idx" ON "affiliate_payout_items"("conversion_id");

-- CreateIndex
CREATE INDEX "affiliate_promotional_assets_product_id_idx" ON "affiliate_promotional_assets"("product_id");

-- CreateIndex
CREATE INDEX "affiliate_fraud_flags_affiliate_id_status_idx" ON "affiliate_fraud_flags"("affiliate_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "coupons_creator_id_code_key" ON "coupons"("creator_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "wishlist_items_wishlist_id_product_id_key" ON "wishlist_items"("wishlist_id", "product_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_at_idx" ON "notifications"("user_id", "read_at");

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_idx" ON "audit_logs"("actor_id");

-- CreateIndex
CREATE INDEX "audit_logs_resource_resource_id_idx" ON "audit_logs"("resource", "resource_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_key_key" ON "system_settings"("key");

-- CreateIndex
CREATE UNIQUE INDEX "feature_flags_name_key" ON "feature_flags"("name");

-- CreateIndex
CREATE INDEX "contact_messages_status_idx" ON "contact_messages"("status");

-- CreateIndex
CREATE INDEX "contact_messages_created_at_idx" ON "contact_messages"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_user_id_key" ON "subscriptions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_stripe_subscription_id_key" ON "subscriptions"("stripe_subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "credit_packs_stripe_price_id_key" ON "credit_packs"("stripe_price_id");

-- CreateIndex
CREATE UNIQUE INDEX "credit_balances_user_id_key" ON "credit_balances"("user_id");

-- CreateIndex
CREATE INDEX "usage_records_user_id_created_at_idx" ON "usage_records"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "_PermissionToRole_B_index" ON "_PermissionToRole"("B");

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_tokens" ADD CONSTRAINT "api_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_profiles" ADD CONSTRAINT "creator_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_verifications" ADD CONSTRAINT "creator_verifications_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_bank_accounts" ADD CONSTRAINT "creator_bank_accounts_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_followers" ADD CONSTRAINT "creator_followers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_followers" ADD CONSTRAINT "creator_followers_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collections" ADD CONSTRAINT "collections_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_tags" ADD CONSTRAINT "product_tags_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_tags" ADD CONSTRAINT "product_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_files" ADD CONSTRAINT "product_files_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_files" ADD CONSTRAINT "product_files_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "product_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_versions" ADD CONSTRAINT "product_versions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_products" ADD CONSTRAINT "collection_products_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_products" ADD CONSTRAINT "collection_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "downloads" ADD CONSTRAINT "downloads_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "downloads" ADD CONSTRAINT "downloads_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "downloads" ADD CONSTRAINT "downloads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "download_logs" ADD CONSTRAINT "download_logs_download_id_fkey" FOREIGN KEY ("download_id") REFERENCES "downloads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_helpful_votes" ADD CONSTRAINT "review_helpful_votes_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "ledger_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "ledger_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliates" ADD CONSTRAINT "affiliates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_links" ADD CONSTRAINT "affiliate_links_affiliate_id_fkey" FOREIGN KEY ("affiliate_id") REFERENCES "affiliates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_links" ADD CONSTRAINT "affiliate_links_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_clicks" ADD CONSTRAINT "affiliate_clicks_affiliate_id_fkey" FOREIGN KEY ("affiliate_id") REFERENCES "affiliates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_clicks" ADD CONSTRAINT "affiliate_clicks_link_id_fkey" FOREIGN KEY ("link_id") REFERENCES "affiliate_links"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_clicks" ADD CONSTRAINT "affiliate_clicks_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_attributions" ADD CONSTRAINT "affiliate_attributions_affiliate_id_fkey" FOREIGN KEY ("affiliate_id") REFERENCES "affiliates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_attributions" ADD CONSTRAINT "affiliate_attributions_link_id_fkey" FOREIGN KEY ("link_id") REFERENCES "affiliate_links"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_attributions" ADD CONSTRAINT "affiliate_attributions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_conversions" ADD CONSTRAINT "affiliate_conversions_affiliate_id_fkey" FOREIGN KEY ("affiliate_id") REFERENCES "affiliates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_conversions" ADD CONSTRAINT "affiliate_conversions_link_id_fkey" FOREIGN KEY ("link_id") REFERENCES "affiliate_links"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_conversions" ADD CONSTRAINT "affiliate_conversions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_ledger" ADD CONSTRAINT "commission_ledger_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_payouts" ADD CONSTRAINT "affiliate_payouts_affiliate_id_fkey" FOREIGN KEY ("affiliate_id") REFERENCES "affiliates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_payout_items" ADD CONSTRAINT "affiliate_payout_items_payout_id_fkey" FOREIGN KEY ("payout_id") REFERENCES "affiliate_payouts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_payout_items" ADD CONSTRAINT "affiliate_payout_items_conversion_id_fkey" FOREIGN KEY ("conversion_id") REFERENCES "affiliate_conversions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_promotional_assets" ADD CONSTRAINT "affiliate_promotional_assets_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_fraud_flags" ADD CONSTRAINT "affiliate_fraud_flags_affiliate_id_fkey" FOREIGN KEY ("affiliate_id") REFERENCES "affiliates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_wishlist_id_fkey" FOREIGN KEY ("wishlist_id") REFERENCES "wishlists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_messages" ADD CONSTRAINT "contact_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_purchases" ADD CONSTRAINT "credit_purchases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_purchases" ADD CONSTRAINT "credit_purchases_credit_pack_id_fkey" FOREIGN KEY ("credit_pack_id") REFERENCES "credit_packs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_purchases" ADD CONSTRAINT "credit_purchases_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_balances" ADD CONSTRAINT "credit_balances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_balance_id_fkey" FOREIGN KEY ("balance_id") REFERENCES "credit_balances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PermissionToRole" ADD CONSTRAINT "_PermissionToRole_A_fkey" FOREIGN KEY ("A") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PermissionToRole" ADD CONSTRAINT "_PermissionToRole_B_fkey" FOREIGN KEY ("B") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

