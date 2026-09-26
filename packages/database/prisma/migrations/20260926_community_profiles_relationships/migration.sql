CREATE TYPE "CommunityProfileVisibility" AS ENUM ('PUBLIC', 'MEMBERS_ONLY', 'HIDDEN');

ALTER TABLE "community_profiles"
ADD COLUMN "headline" TEXT,
ADD COLUMN "bio" TEXT,
ADD COLUMN "expertise" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "goals" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "links" JSONB,
ADD COLUMN "visibility" "CommunityProfileVisibility" NOT NULL DEFAULT 'MEMBERS_ONLY';

CREATE TABLE "community_follows" (
  "id" UUID NOT NULL,
  "follower_id" UUID NOT NULL,
  "following_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "community_follows_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "community_bookmarks" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "post_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "community_bookmarks_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "community_subscriptions" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "post_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "community_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "community_follows_follower_id_following_id_key" ON "community_follows"("follower_id", "following_id");
CREATE INDEX "community_follows_following_id_idx" ON "community_follows"("following_id");
CREATE UNIQUE INDEX "community_bookmarks_user_id_post_id_key" ON "community_bookmarks"("user_id", "post_id");
CREATE INDEX "community_bookmarks_post_id_idx" ON "community_bookmarks"("post_id");
CREATE UNIQUE INDEX "community_subscriptions_user_id_post_id_key" ON "community_subscriptions"("user_id", "post_id");
CREATE INDEX "community_subscriptions_post_id_idx" ON "community_subscriptions"("post_id");

ALTER TABLE "community_follows" ADD CONSTRAINT "community_follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "community_follows" ADD CONSTRAINT "community_follows_following_id_fkey" FOREIGN KEY ("following_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "community_bookmarks" ADD CONSTRAINT "community_bookmarks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "community_bookmarks" ADD CONSTRAINT "community_bookmarks_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "community_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "community_subscriptions" ADD CONSTRAINT "community_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "community_subscriptions" ADD CONSTRAINT "community_subscriptions_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "community_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
