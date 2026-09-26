CREATE TYPE "CommunityContentFormat" AS ENUM ('MARKDOWN', 'RICH_HTML');
CREATE TYPE "CommunityPostType" AS ENUM ('DISCUSSION', 'QUESTION', 'ANNOUNCEMENT');
CREATE TYPE "CommunityContentStatus" AS ENUM ('PUBLISHED', 'HIDDEN', 'DELETED', 'REMOVED');
CREATE TYPE "CommunityReportStatus" AS ENUM ('OPEN', 'RESOLVED', 'DISMISSED');

ALTER TABLE "community_posts"
ADD COLUMN "content_format" "CommunityContentFormat" NOT NULL DEFAULT 'MARKDOWN',
ADD COLUMN "post_type" "CommunityPostType" NOT NULL DEFAULT 'DISCUSSION',
ADD COLUMN "status" "CommunityContentStatus" NOT NULL DEFAULT 'PUBLISHED',
ADD COLUMN "access_level" "CommunityAccessLevel" NOT NULL DEFAULT 'FREE',
ADD COLUMN "context_type" TEXT,
ADD COLUMN "context_id" UUID,
ADD COLUMN "accepted_comment_id" UUID;

ALTER TABLE "community_comments"
ADD COLUMN "content_format" "CommunityContentFormat" NOT NULL DEFAULT 'MARKDOWN',
ADD COLUMN "status" "CommunityContentStatus" NOT NULL DEFAULT 'PUBLISHED',
ADD COLUMN "parent_id" UUID;

CREATE UNIQUE INDEX "community_posts_accepted_comment_id_key" ON "community_posts"("accepted_comment_id");
CREATE INDEX "community_posts_status_last_activity_at_idx" ON "community_posts"("status", "last_activity_at");
CREATE INDEX "community_posts_context_type_context_id_idx" ON "community_posts"("context_type", "context_id");
CREATE INDEX "community_comments_parent_id_idx" ON "community_comments"("parent_id");

CREATE TABLE "community_reports" (
  "id" UUID NOT NULL, "reporter_id" UUID NOT NULL, "target_type" TEXT NOT NULL,
  "target_id" UUID NOT NULL, "reason" TEXT NOT NULL, "details" TEXT,
  "status" "CommunityReportStatus" NOT NULL DEFAULT 'OPEN',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "community_reports_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "community_moderation_actions" (
  "id" UUID NOT NULL, "actor_id" UUID NOT NULL, "target_type" TEXT NOT NULL,
  "target_id" UUID NOT NULL, "action" TEXT NOT NULL, "reason" TEXT, "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "community_moderation_actions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "community_reports_reporter_id_target_type_target_id_reason_key" ON "community_reports"("reporter_id", "target_type", "target_id", "reason");
CREATE INDEX "community_reports_status_created_at_idx" ON "community_reports"("status", "created_at");
CREATE INDEX "community_moderation_actions_target_type_target_id_idx" ON "community_moderation_actions"("target_type", "target_id");
CREATE INDEX "community_moderation_actions_actor_id_created_at_idx" ON "community_moderation_actions"("actor_id", "created_at");

ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_accepted_comment_id_fkey" FOREIGN KEY ("accepted_comment_id") REFERENCES "community_comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "community_comments" ADD CONSTRAINT "community_comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "community_comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "community_reports" ADD CONSTRAINT "community_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "community_moderation_actions" ADD CONSTRAINT "community_moderation_actions_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
