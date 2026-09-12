-- Post attachments (array of { url, name, type, size } stored as JSON)
ALTER TABLE "community_posts" ADD COLUMN "attachments" JSONB;
