-- Cross-domain Growth Club foundations. Feature-specific tables are introduced
-- by their owning migrations so old and new application versions can overlap.
CREATE TYPE "CommunityParticipationStatus" AS ENUM ('ACTIVE', 'SUSPENDED');
CREATE TYPE "CommunityAccessLevel" AS ENUM ('FREE', 'PREMIUM');

ALTER TABLE "community_profiles"
ADD COLUMN "participation_status" "CommunityParticipationStatus" NOT NULL DEFAULT 'ACTIVE';

CREATE TABLE "community_notification_preferences" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "in_app_enabled" BOOLEAN NOT NULL DEFAULT true,
    "reply_enabled" BOOLEAN NOT NULL DEFAULT true,
    "mention_enabled" BOOLEAN NOT NULL DEFAULT true,
    "reminder_email" BOOLEAN NOT NULL DEFAULT true,
    "digest_email" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "community_notification_preferences_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "community_deliveries" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "claimed_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "suppressed_at" TIMESTAMP(3),
    "reason" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "community_deliveries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "community_notification_preferences_user_id_key" ON "community_notification_preferences"("user_id");
CREATE UNIQUE INDEX "community_deliveries_key_key" ON "community_deliveries"("key");
CREATE INDEX "community_deliveries_status_scheduled_at_idx" ON "community_deliveries"("status", "scheduled_at");
CREATE INDEX "community_deliveries_user_id_kind_idx" ON "community_deliveries"("user_id", "kind");

ALTER TABLE "community_notification_preferences" ADD CONSTRAINT "community_notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "community_deliveries" ADD CONSTRAINT "community_deliveries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "feature_flags" ("id", "name", "description", "is_enabled", "rollout_percentage", "environment", "created_at", "updated_at")
VALUES
  (gen_random_uuid(), 'community-shell', 'Professional Growth Club workspace', false, 0, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'community-profiles', 'Member profiles and relationships', false, 0, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'community-knowledge', 'Knowledge and moderation tools', false, 0, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'community-learning', 'Enhanced learning and certificates', false, 0, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'community-programming', 'Events and office hours', false, 0, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'community-challenges', 'Challenges and accountability groups', false, 0, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;
