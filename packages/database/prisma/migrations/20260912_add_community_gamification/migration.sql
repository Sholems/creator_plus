-- CreateTable
CREATE TABLE "community_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "community_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "community_point_events" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "points" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "source_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "community_point_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "community_profiles_user_id_key" ON "community_profiles"("user_id");
CREATE INDEX "community_profiles_points_idx" ON "community_profiles"("points");
CREATE INDEX "community_point_events_user_id_idx" ON "community_point_events"("user_id");
CREATE UNIQUE INDEX "community_point_events_user_id_reason_source_id_key" ON "community_point_events"("user_id", "reason", "source_id");

-- AddForeignKey
ALTER TABLE "community_profiles" ADD CONSTRAINT "community_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "community_point_events" ADD CONSTRAINT "community_point_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
