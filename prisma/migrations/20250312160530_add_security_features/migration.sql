/*
  Warnings:

  - The primary key for the `SecurityLog` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `ipAddress` on the `SecurityLog` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "SecurityLog" DROP CONSTRAINT "SecurityLog_pkey",
DROP COLUMN "ipAddress",
ADD COLUMN     "details" TEXT,
ADD COLUMN     "eventType" TEXT,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "SecurityLog_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "SecurityLog_id_seq";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "loginAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "passwordChangedAt" TIMESTAMP(3),
ADD COLUMN     "passwordResetRequested" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "profileCompleted" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "SecurityLog_userId_idx" ON "SecurityLog"("userId");

-- CreateIndex
CREATE INDEX "SecurityLog_eventType_idx" ON "SecurityLog"("eventType");

-- CreateIndex
CREATE INDEX "SecurityLog_timestamp_idx" ON "SecurityLog"("timestamp");
