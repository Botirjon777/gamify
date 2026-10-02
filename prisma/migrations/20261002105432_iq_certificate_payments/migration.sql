-- CreateEnum
CREATE TYPE "PaymentProduct" AS ENUM ('PLAN', 'IQ_CERTIFICATE');

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "product" "PaymentProduct" NOT NULL DEFAULT 'PLAN',
ALTER COLUMN "plan" DROP NOT NULL;
