-- Event cancellation timestamp (distinguishes a cancelled event from an unpublished draft)
ALTER TABLE "community_events" ADD COLUMN "canceled_at" TIMESTAMP(3);
