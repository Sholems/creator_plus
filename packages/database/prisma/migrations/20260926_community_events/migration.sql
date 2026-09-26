CREATE TYPE "CommunityEventType" AS ENUM ('LIVE_SESSION', 'OFFICE_HOURS', 'WORKSHOP');
CREATE TYPE "CommunityEventRsvpStatus" AS ENUM ('GOING', 'CANCELLED');

CREATE TABLE "community_events" (
  "id" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "description_format" "CommunityContentFormat" NOT NULL DEFAULT 'MARKDOWN',
  "type" "CommunityEventType" NOT NULL DEFAULT 'LIVE_SESSION',
  "access_level" "CommunityAccessLevel" NOT NULL DEFAULT 'FREE',
  "host_name" TEXT,
  "cover_image" TEXT,
  "starts_at" TIMESTAMP(3) NOT NULL,
  "ends_at" TIMESTAMP(3),
  "timezone" TEXT NOT NULL DEFAULT 'Africa/Lagos',
  "meeting_url" TEXT,
  "replay_url" TEXT,
  "capacity" INTEGER,
  "published" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "community_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "community_event_rsvps" (
  "id" UUID NOT NULL,
  "event_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "status" "CommunityEventRsvpStatus" NOT NULL DEFAULT 'GOING',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "community_event_rsvps_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "community_events_slug_key" ON "community_events"("slug");
CREATE INDEX "community_events_published_starts_at_idx" ON "community_events"("published", "starts_at");
CREATE UNIQUE INDEX "community_event_rsvps_event_id_user_id_key" ON "community_event_rsvps"("event_id", "user_id");
CREATE INDEX "community_event_rsvps_user_id_status_idx" ON "community_event_rsvps"("user_id", "status");

ALTER TABLE "community_event_rsvps" ADD CONSTRAINT "community_event_rsvps_event_id_fkey"
FOREIGN KEY ("event_id") REFERENCES "community_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "community_event_rsvps" ADD CONSTRAINT "community_event_rsvps_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
