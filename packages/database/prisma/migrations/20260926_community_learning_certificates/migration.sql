ALTER TABLE "courses"
ADD COLUMN "description_format" "CommunityContentFormat" NOT NULL DEFAULT 'MARKDOWN';

ALTER TABLE "lessons"
ADD COLUMN "body_format" "CommunityContentFormat" NOT NULL DEFAULT 'MARKDOWN';

CREATE TABLE "course_certificates" (
  "id" UUID NOT NULL,
  "verification_id" TEXT NOT NULL,
  "course_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "course_certificates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "course_certificates_verification_id_key"
ON "course_certificates"("verification_id");

CREATE UNIQUE INDEX "course_certificates_course_id_user_id_key"
ON "course_certificates"("course_id", "user_id");

CREATE INDEX "course_certificates_user_id_issued_at_idx"
ON "course_certificates"("user_id", "issued_at");

ALTER TABLE "course_certificates"
ADD CONSTRAINT "course_certificates_course_id_fkey"
FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "course_certificates"
ADD CONSTRAINT "course_certificates_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
