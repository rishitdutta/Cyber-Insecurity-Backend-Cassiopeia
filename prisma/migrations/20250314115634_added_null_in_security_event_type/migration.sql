/*
  Warnings:

  - You are about to drop the column `action` on the `SecurityLog` table. All the data in the column will be lost.
  - You are about to drop the column `timestamp` on the `SecurityLog` table. All the data in the column will be lost.
  - The `details` column on the `SecurityLog` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `eventType` column on the `SecurityLog` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Made the column `userId` on table `SecurityLog` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "SecurityEventType" AS ENUM ('ACCOUNT_VERIFICATION', 'FAILED_LOGIN_ATTEMPT', 'PASSWORD_RESET', 'MFA_ENABLED', 'SUSPICIOUS_ACTIVITY', 'PROFILE_UPDATE', 'ASSET_TRANSFER', 'LOAN_APPLICATION', 'NULL');

-- DropForeignKey
ALTER TABLE "SecurityLog" DROP CONSTRAINT "SecurityLog_userId_fkey";

-- DropIndex
DROP INDEX "SecurityLog_timestamp_idx";

-- AlterTable
ALTER TABLE "SecurityLog" DROP COLUMN "action",
DROP COLUMN "timestamp",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "ipAddress" TEXT,
ADD COLUMN     "userAgent" TEXT,
ALTER COLUMN "userId" SET NOT NULL,
DROP COLUMN "details",
ADD COLUMN     "details" JSONB,
DROP COLUMN "eventType",
ADD COLUMN     "eventType" "SecurityEventType" NOT NULL DEFAULT 'NULL';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "address" TEXT,
ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "lastIp" TEXT;

-- CreateIndex
CREATE INDEX "SecurityLog_eventType_idx" ON "SecurityLog"("eventType");

-- CreateIndex
CREATE INDEX "SecurityLog_createdAt_idx" ON "SecurityLog"("createdAt");

-- AddForeignKey
ALTER TABLE "SecurityLog" ADD CONSTRAINT "SecurityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
