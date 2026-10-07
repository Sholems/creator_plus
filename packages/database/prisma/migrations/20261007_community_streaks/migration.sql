-- Daily-visit streak tracking on the community profile
ALTER TABLE "community_profiles" ADD COLUMN "last_active_on" TIMESTAMP(3);
ALTER TABLE "community_profiles" ADD COLUMN "current_streak" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "community_profiles" ADD COLUMN "longest_streak" INTEGER NOT NULL DEFAULT 0;
