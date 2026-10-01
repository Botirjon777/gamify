-- CreateEnum
CREATE TYPE "TrackCategory" AS ENUM ('FRONTEND', 'BACKEND', 'CYBERSECURITY', 'LINUX', 'NETWORKING', 'BASIC', 'MIX');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'TRACK_COMPLETED';
ALTER TYPE "NotificationType" ADD VALUE 'SEASON_RESULT';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "XpReason" ADD VALUE 'WEEKLY_BONUS';
ALTER TYPE "XpReason" ADD VALUE 'TRACK_COMPLETE';

-- AlterTable
ALTER TABLE "Track" ADD COLUMN     "category" "TrackCategory" NOT NULL DEFAULT 'BASIC';

-- CreateTable
CREATE TABLE "WeeklyTopic" (
    "week" DATE NOT NULL,
    "trackId" TEXT NOT NULL,
    "setById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeeklyTopic_pkey" PRIMARY KEY ("week")
);

-- CreateTable
CREATE TABLE "Season" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "finalizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeasonScore" (
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "SeasonScore_pkey" PRIMARY KEY ("userId","tenantId","seasonId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Season_number_key" ON "Season"("number");

-- CreateIndex
CREATE INDEX "SeasonScore_tenantId_seasonId_value_idx" ON "SeasonScore"("tenantId", "seasonId", "value" DESC);

-- CreateIndex
CREATE INDEX "Track_category_order_idx" ON "Track"("category", "order");

-- AddForeignKey
ALTER TABLE "WeeklyTopic" ADD CONSTRAINT "WeeklyTopic_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeasonScore" ADD CONSTRAINT "SeasonScore_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeasonScore" ADD CONSTRAINT "SeasonScore_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeasonScore" ADD CONSTRAINT "SeasonScore_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Data: categories for the existing tracks (content:sync keeps them in sync from track.yaml afterwards)
UPDATE "Track" SET "category" = 'FRONTEND' WHERE "slug" IN ('html', 'css', 'javascript', 'typescript', 'react');
UPDATE "Track" SET "category" = 'BACKEND' WHERE "slug" IN ('python', 'csharp', 'cpp');
UPDATE "Track" SET "category" = 'CYBERSECURITY' WHERE "slug" = 'cybersecurity';

-- Data: Season 1 = 1 Oct 2026 – 1 Jan 2027 (Tashkent midnight = 19:00 UTC the day before)
INSERT INTO "Season" ("id", "number", "startsAt", "endsAt")
VALUES ('season_1', 1, '2026-09-30 19:00:00', '2026-12-31 19:00:00')
ON CONFLICT ("number") DO NOTHING;

-- XP already earned since the season started counts
INSERT INTO "SeasonScore" ("userId", "tenantId", "seasonId", "value")
SELECT "userId", "tenantId", 'season_1', SUM("amount")
FROM "XpEvent" WHERE "createdAt" >= '2026-09-30 19:00:00'
GROUP BY "userId", "tenantId";
