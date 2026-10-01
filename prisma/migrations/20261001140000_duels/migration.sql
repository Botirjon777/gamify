-- CreateEnum
CREATE TYPE "DuelStatus" AS ENUM ('PENDING', 'ACTIVE', 'DONE', 'DECLINED', 'EXPIRED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'DUEL_INVITE';
ALTER TYPE "NotificationType" ADD VALUE 'DUEL_DECLINED';
ALTER TYPE "NotificationType" ADD VALUE 'DUEL_RESULT';

-- AlterEnum
ALTER TYPE "XpReason" ADD VALUE 'DUEL';

-- CreateTable
CREATE TABLE "Duel" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "challengerId" TEXT NOT NULL,
    "opponentId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "stake" INTEGER NOT NULL,
    "questionIds" TEXT[],
    "status" "DuelStatus" NOT NULL DEFAULT 'PENDING',
    "winnerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Duel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DuelRun" (
    "duelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "correct" INTEGER NOT NULL DEFAULT 0,
    "answers" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "DuelRun_pkey" PRIMARY KEY ("duelId","userId")
);

-- CreateIndex
CREATE INDEX "Duel_challengerId_status_idx" ON "Duel"("challengerId", "status");

-- CreateIndex
CREATE INDEX "Duel_opponentId_status_idx" ON "Duel"("opponentId", "status");

-- AddForeignKey
ALTER TABLE "Duel" ADD CONSTRAINT "Duel_challengerId_fkey" FOREIGN KEY ("challengerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Duel" ADD CONSTRAINT "Duel_opponentId_fkey" FOREIGN KEY ("opponentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Duel" ADD CONSTRAINT "Duel_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuelRun" ADD CONSTRAINT "DuelRun_duelId_fkey" FOREIGN KEY ("duelId") REFERENCES "Duel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuelRun" ADD CONSTRAINT "DuelRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

