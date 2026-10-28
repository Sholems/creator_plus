ALTER TABLE "qr_campaigns"
  ADD COLUMN "folder" TEXT,
  ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE TABLE "qr_placement_variants" (
  "id" UUID NOT NULL,
  "campaign_id" UUID NOT NULL,
  "public_code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "utm_source" TEXT,
  "utm_medium" TEXT,
  "utm_campaign" TEXT,
  "utm_content" TEXT,
  "utm_term" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "qr_placement_variants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "qr_placement_variants_public_code_key" ON "qr_placement_variants"("public_code");
CREATE INDEX "qr_placement_variants_campaign_id_active_idx" ON "qr_placement_variants"("campaign_id", "active");

ALTER TABLE "qr_placement_variants"
  ADD CONSTRAINT "qr_placement_variants_campaign_id_fkey"
  FOREIGN KEY ("campaign_id") REFERENCES "qr_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "qr_scan_events" ADD COLUMN "placement_variant_id" UUID;
CREATE INDEX "qr_scan_events_placement_variant_id_kind_created_at_idx"
  ON "qr_scan_events"("placement_variant_id", "kind", "created_at");
ALTER TABLE "qr_scan_events"
  ADD CONSTRAINT "qr_scan_events_placement_variant_id_fkey"
  FOREIGN KEY ("placement_variant_id") REFERENCES "qr_placement_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
