-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('DIGITAL', 'EVENT');
CREATE TYPE "EventLocationType" AS ENUM ('VIRTUAL', 'PHYSICAL', 'HYBRID');
CREATE TYPE "EventStatus" AS ENUM ('PUBLISHED', 'CANCELLED');
CREATE TYPE "EventTicketStatus" AS ENUM ('HELD', 'VALID', 'CHECKED_IN', 'CANCELLED');

-- AlterTable
ALTER TABLE "products" ADD COLUMN "product_type" "ProductType" NOT NULL DEFAULT 'DIGITAL';

-- CreateTable
CREATE TABLE "events" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3),
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Lagos',
    "location_type" "EventLocationType" NOT NULL DEFAULT 'VIRTUAL',
    "join_url" TEXT,
    "venue_name" TEXT,
    "venue_address" TEXT,
    "capacity" INTEGER,
    "registration_deadline" TIMESTAMP(3),
    "status" "EventStatus" NOT NULL DEFAULT 'PUBLISHED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "order_item_id" UUID,
    "buyer_id" UUID NOT NULL,
    "ticket_code" TEXT NOT NULL,
    "attendee_name" TEXT,
    "attendee_email" TEXT,
    "status" "EventTicketStatus" NOT NULL DEFAULT 'HELD',
    "hold_expires_at" TIMESTAMP(3),
    "checked_in_at" TIMESTAMP(3),
    "checked_in_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "events_product_id_key" ON "events"("product_id");
CREATE UNIQUE INDEX "tickets_ticket_code_key" ON "tickets"("ticket_code");
CREATE INDEX "tickets_event_id_idx" ON "tickets"("event_id");
CREATE INDEX "tickets_buyer_id_idx" ON "tickets"("buyer_id");
CREATE INDEX "tickets_order_id_idx" ON "tickets"("order_id");
CREATE INDEX "tickets_event_id_status_idx" ON "tickets"("event_id", "status");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
