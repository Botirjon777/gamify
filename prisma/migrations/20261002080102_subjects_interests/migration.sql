-- CreateEnum
CREATE TYPE "Subject" AS ENUM ('PROGRAMMING', 'MATH', 'GEOMETRY', 'PHYSICS', 'CHEMISTRY', 'BIOLOGY', 'CHESS');

-- AlterTable
ALTER TABLE "Track" ADD COLUMN     "subject" "Subject" NOT NULL DEFAULT 'PROGRAMMING',
ALTER COLUMN "category" DROP NOT NULL,
ALTER COLUMN "category" DROP DEFAULT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "interests" "Subject"[] DEFAULT ARRAY[]::"Subject"[],
ADD COLUMN     "interestsSetAt" TIMESTAMP(3);
