-- AlterTable
ALTER TABLE "User" ADD COLUMN     "mfaSecret" TEXT,
ADD COLUMN     "otp" TEXT,
ADD COLUMN     "otpExpiry" TIMESTAMP(3);
