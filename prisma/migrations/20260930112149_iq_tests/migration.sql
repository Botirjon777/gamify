-- CreateEnum
CREATE TYPE "IqSessionKind" AS ENUM ('PLACEMENT', 'DAILY');

-- CreateEnum
CREATE TYPE "IqSessionStatus" AS ENUM ('ACTIVE', 'FINISHED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "iqTestedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "IqItem" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "difficulty" INTEGER NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL,
    "content" JSONB NOT NULL,
    "answer" INTEGER NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED',
    "timesAnswered" INTEGER NOT NULL DEFAULT 0,
    "timesCorrect" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "IqItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IqSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "kind" "IqSessionKind" NOT NULL,
    "status" "IqSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "total" INTEGER NOT NULL,
    "answered" INTEGER NOT NULL DEFAULT 0,
    "correct" INTEGER NOT NULL DEFAULT 0,
    "currentItemId" TEXT,
    "currentShownAt" TIMESTAMP(3),
    "ratingBefore" DOUBLE PRECISION NOT NULL,
    "ratingAfter" DOUBLE PRECISION,
    "xpAwarded" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "IqSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IqAttempt" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "choice" INTEGER,
    "correct" BOOLEAN NOT NULL,
    "timeMs" INTEGER NOT NULL,
    "ratingBefore" DOUBLE PRECISION NOT NULL,
    "ratingAfter" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IqAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IqItem_key_key" ON "IqItem"("key");

-- CreateIndex
CREATE INDEX "IqSession_userId_kind_status_idx" ON "IqSession"("userId", "kind", "status");

-- CreateIndex
CREATE INDEX "IqAttempt_userId_itemId_idx" ON "IqAttempt"("userId", "itemId");

-- AddForeignKey
ALTER TABLE "IqSession" ADD CONSTRAINT "IqSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IqAttempt" ADD CONSTRAINT "IqAttempt_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "IqSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IqAttempt" ADD CONSTRAINT "IqAttempt_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "IqItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
