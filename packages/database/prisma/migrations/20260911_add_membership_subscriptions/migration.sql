-- CreateEnum
CREATE TYPE "BillingInterval" AS ENUM ('MONTHLY', 'ANNUAL');
CREATE TYPE "MembershipStatus" AS ENUM ('PENDING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'EXPIRED');

-- CreateTable
CREATE TABLE "membership_plans" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "membership_plans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "membership_plan_prices" (
    "id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "interval" "BillingInterval" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "provider_plan_code" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "membership_plan_prices_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "membership_subscriptions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "price_id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'PENDING',
    "provider_customer_id" TEXT,
    "provider_subscription_id" TEXT,
    "provider_reference" TEXT,
    "current_period_end" TIMESTAMP(3),
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "canceled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "membership_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "membership_plan_prices_plan_id_provider_currency_interval_key" ON "membership_plan_prices"("plan_id", "provider", "currency", "interval");
CREATE INDEX "membership_subscriptions_user_id_status_idx" ON "membership_subscriptions"("user_id", "status");
CREATE INDEX "membership_subscriptions_provider_provider_subscription_id_idx" ON "membership_subscriptions"("provider", "provider_subscription_id");
CREATE INDEX "membership_subscriptions_provider_reference_idx" ON "membership_subscriptions"("provider_reference");
CREATE INDEX "membership_subscriptions_status_current_period_end_idx" ON "membership_subscriptions"("status", "current_period_end");

-- AddForeignKey
ALTER TABLE "membership_plan_prices" ADD CONSTRAINT "membership_plan_prices_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "membership_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "membership_subscriptions" ADD CONSTRAINT "membership_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "membership_subscriptions" ADD CONSTRAINT "membership_subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "membership_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "membership_subscriptions" ADD CONSTRAINT "membership_subscriptions_price_id_fkey" FOREIGN KEY ("price_id") REFERENCES "membership_plan_prices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
