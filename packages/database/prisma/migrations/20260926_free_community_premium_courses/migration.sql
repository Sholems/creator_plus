-- Community participation is free for every registered user. Paid access now
-- applies at the course level so premium learning can be introduced safely.
CREATE TYPE "CourseAccessLevel" AS ENUM ('FREE', 'PREMIUM');

ALTER TABLE "courses"
ADD COLUMN "access_level" "CourseAccessLevel" NOT NULL DEFAULT 'FREE';
