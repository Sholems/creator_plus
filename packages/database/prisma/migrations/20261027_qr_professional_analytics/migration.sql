ALTER TYPE "QrEventKind" ADD VALUE IF NOT EXISTS 'ACTION';

ALTER TABLE "qr_scan_events"
ADD COLUMN "action_type" TEXT;

CREATE INDEX "qr_scan_events_campaign_id_action_type_created_at_idx"
ON "qr_scan_events"("campaign_id", "action_type", "created_at");
