-- CreateTable
CREATE TABLE "GuestIqTest" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "phone" TEXT NOT NULL,
    "status" "IqSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "total" INTEGER NOT NULL,
    "answered" INTEGER NOT NULL DEFAULT 0,
    "correct" INTEGER NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 1000,
    "askedItemIds" TEXT[],
    "currentItemId" TEXT,
    "currentShownAt" TIMESTAMP(3),
    "iq" INTEGER,
    "finishedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "paidById" TEXT,
    "amountUzs" INTEGER NOT NULL DEFAULT 0,
    "partnerId" TEXT,
    "referredById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuestIqTest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GuestIqTest_token_key" ON "GuestIqTest"("token");

-- CreateIndex
CREATE UNIQUE INDEX "GuestIqTest_code_key" ON "GuestIqTest"("code");

-- CreateIndex
CREATE INDEX "GuestIqTest_status_paidAt_finishedAt_idx" ON "GuestIqTest"("status", "paidAt", "finishedAt");

-- CreateIndex
CREATE INDEX "GuestIqTest_phone_idx" ON "GuestIqTest"("phone");

-- CreateIndex
CREATE INDEX "GuestIqTest_partnerId_idx" ON "GuestIqTest"("partnerId");

-- CreateIndex
CREATE INDEX "GuestIqTest_referredById_idx" ON "GuestIqTest"("referredById");

-- AddForeignKey
ALTER TABLE "GuestIqTest" ADD CONSTRAINT "GuestIqTest_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestIqTest" ADD CONSTRAINT "GuestIqTest_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "GuestIqTest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
