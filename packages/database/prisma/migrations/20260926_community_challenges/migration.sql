CREATE TYPE "CommunityChallengeEnrollmentStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'WITHDRAWN');

CREATE TABLE "community_challenges" (
  "id" UUID NOT NULL, "title" TEXT NOT NULL, "slug" TEXT NOT NULL,
  "description" TEXT, "description_format" "CommunityContentFormat" NOT NULL DEFAULT 'MARKDOWN',
  "access_level" "CommunityAccessLevel" NOT NULL DEFAULT 'FREE', "cover_image" TEXT,
  "starts_at" TIMESTAMP(3) NOT NULL, "ends_at" TIMESTAMP(3) NOT NULL,
  "published" BOOLEAN NOT NULL DEFAULT false, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL, CONSTRAINT "community_challenges_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "community_challenge_milestones" (
  "id" UUID NOT NULL, "challenge_id" UUID NOT NULL, "title" TEXT NOT NULL,
  "description" TEXT, "due_at" TIMESTAMP(3), "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "community_challenge_milestones_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "community_accountability_groups" (
  "id" UUID NOT NULL, "challenge_id" UUID NOT NULL, "name" TEXT NOT NULL,
  "capacity" INTEGER NOT NULL DEFAULT 8, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "community_accountability_groups_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "community_challenge_enrollments" (
  "id" UUID NOT NULL, "challenge_id" UUID NOT NULL, "user_id" UUID NOT NULL, "group_id" UUID,
  "status" "CommunityChallengeEnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
  "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "completed_at" TIMESTAMP(3),
  CONSTRAINT "community_challenge_enrollments_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "community_challenge_check_ins" (
  "id" UUID NOT NULL, "enrollment_id" UUID NOT NULL, "milestone_id" UUID,
  "note" TEXT, "progress" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "community_challenge_check_ins_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "community_challenges_slug_key" ON "community_challenges"("slug");
CREATE INDEX "community_challenges_published_starts_at_idx" ON "community_challenges"("published", "starts_at");
CREATE INDEX "community_challenge_milestones_challenge_id_sort_order_idx" ON "community_challenge_milestones"("challenge_id", "sort_order");
CREATE INDEX "community_accountability_groups_challenge_id_idx" ON "community_accountability_groups"("challenge_id");
CREATE UNIQUE INDEX "community_challenge_enrollments_challenge_id_user_id_key" ON "community_challenge_enrollments"("challenge_id", "user_id");
CREATE INDEX "community_challenge_enrollments_group_id_idx" ON "community_challenge_enrollments"("group_id");
CREATE INDEX "community_challenge_enrollments_user_id_status_idx" ON "community_challenge_enrollments"("user_id", "status");
CREATE INDEX "community_challenge_check_ins_enrollment_id_created_at_idx" ON "community_challenge_check_ins"("enrollment_id", "created_at");
CREATE INDEX "community_challenge_check_ins_milestone_id_idx" ON "community_challenge_check_ins"("milestone_id");

ALTER TABLE "community_challenge_milestones" ADD CONSTRAINT "community_challenge_milestones_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "community_challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "community_accountability_groups" ADD CONSTRAINT "community_accountability_groups_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "community_challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "community_challenge_enrollments" ADD CONSTRAINT "community_challenge_enrollments_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "community_challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "community_challenge_enrollments" ADD CONSTRAINT "community_challenge_enrollments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "community_challenge_enrollments" ADD CONSTRAINT "community_challenge_enrollments_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "community_accountability_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "community_challenge_check_ins" ADD CONSTRAINT "community_challenge_check_ins_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "community_challenge_enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "community_challenge_check_ins" ADD CONSTRAINT "community_challenge_check_ins_milestone_id_fkey" FOREIGN KEY ("milestone_id") REFERENCES "community_challenge_milestones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
