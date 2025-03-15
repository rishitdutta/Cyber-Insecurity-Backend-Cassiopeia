-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SecurityEventType" ADD VALUE 'FAILED_OTP_VERIFICATION';
ALTER TYPE "SecurityEventType" ADD VALUE 'LOGIN_OTP_SENT';
ALTER TYPE "SecurityEventType" ADD VALUE 'FAILED_LOGIN_OTP';
ALTER TYPE "SecurityEventType" ADD VALUE 'SUCCESSFUL_LOGIN';
