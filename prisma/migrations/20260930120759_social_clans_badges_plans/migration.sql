-- CreateEnum
CREATE TYPE "UserPlan" AS ENUM ('FREE', 'PRO', 'DIAMOND');

-- CreateEnum
CREATE TYPE "FriendshipStatus" AS ENUM ('PENDING', 'ACCEPTED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('FRIEND_REQUEST', 'FRIEND_ACCEPTED', 'CLAN_JOIN_REQUEST', 'CLAN_JOIN_APPROVED', 'CLAN_JOIN_REJECTED', 'CLAN_WEEKLY_RESULT', 'BADGE_EARNED', 'LEVEL_UP', 'REFERRAL_JOINED', 'REFERRAL_REWARD');

-- CreateEnum
CREATE TYPE "ClanRole" AS ENUM ('LEADER', 'OFFICER', 'MEMBER');

-- CreateEnum
CREATE TYPE "JoinRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "XpReason" ADD VALUE 'REFERRAL';
ALTER TYPE "XpReason" ADD VALUE 'BADGE';
ALTER TYPE "XpReason" ADD VALUE 'CLAN_REWARD';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatarStyle" TEXT NOT NULL DEFAULT 'adventurer',
ADD COLUMN     "bio" TEXT,
ADD COLUMN     "plan" "UserPlan" NOT NULL DEFAULT 'FREE',
ADD COLUMN     "planExpiresAt" TIMESTAMP(3),
ADD COLUMN     "referralCode" TEXT,
ADD COLUMN     "referralRewardedAt" TIMESTAMP(3),
ADD COLUMN     "referredById" TEXT;

-- CreateTable
CREATE TABLE "Friendship" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "addresseeId" TEXT NOT NULL,
    "status" "FriendshipStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "Friendship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "data" JSONB NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBadge" (
    "userId" TEXT NOT NULL,
    "badge" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserBadge_pkey" PRIMARY KEY ("userId","badge")
);

-- CreateTable
CREATE TABLE "Clan" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "description" TEXT,
    "emblem" TEXT NOT NULL DEFAULT 'shield',
    "color" TEXT NOT NULL DEFAULT 'brand',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Clan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClanMember" (
    "clanId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ClanRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClanMember_pkey" PRIMARY KEY ("clanId","userId")
);

-- CreateTable
CREATE TABLE "ClanJoinRequest" (
    "id" TEXT NOT NULL,
    "clanId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" TEXT,
    "status" "JoinRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "decidedById" TEXT,

    CONSTRAINT "ClanJoinRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClanWeeklyResult" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "week" DATE NOT NULL,
    "clanId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "members" INTEGER NOT NULL,

    CONSTRAINT "ClanWeeklyResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Friendship_addresseeId_status_idx" ON "Friendship"("addresseeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Friendship_requesterId_addresseeId_key" ON "Friendship"("requesterId", "addresseeId");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Clan_slug_key" ON "Clan"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Clan_tag_key" ON "Clan"("tag");

-- CreateIndex
CREATE INDEX "Clan_tenantId_idx" ON "Clan"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ClanMember_userId_key" ON "ClanMember"("userId");

-- CreateIndex
CREATE INDEX "ClanJoinRequest_clanId_status_idx" ON "ClanJoinRequest"("clanId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ClanJoinRequest_clanId_userId_key" ON "ClanJoinRequest"("clanId", "userId");

-- CreateIndex
CREATE INDEX "ClanWeeklyResult_tenantId_week_rank_idx" ON "ClanWeeklyResult"("tenantId", "week", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "ClanWeeklyResult_week_clanId_key" ON "ClanWeeklyResult"("week", "clanId");

-- CreateIndex
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_addresseeId_fkey" FOREIGN KEY ("addresseeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClanMember" ADD CONSTRAINT "ClanMember_clanId_fkey" FOREIGN KEY ("clanId") REFERENCES "Clan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClanMember" ADD CONSTRAINT "ClanMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClanJoinRequest" ADD CONSTRAINT "ClanJoinRequest_clanId_fkey" FOREIGN KEY ("clanId") REFERENCES "Clan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClanJoinRequest" ADD CONSTRAINT "ClanJoinRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClanWeeklyResult" ADD CONSTRAINT "ClanWeeklyResult_clanId_fkey" FOREIGN KEY ("clanId") REFERENCES "Clan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

