-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SecurityEventType" ADD VALUE 'PASSWORD_RESET_REQUESTED';
ALTER TYPE "SecurityEventType" ADD VALUE 'PASSWORD_RESET_COMPLETED';
ALTER TYPE "SecurityEventType" ADD VALUE 'PROFILE_COMPLETED';
ALTER TYPE "SecurityEventType" ADD VALUE 'MFA_DISABLED';
ALTER TYPE "SecurityEventType" ADD VALUE 'ASSET_CREATED';
ALTER TYPE "SecurityEventType" ADD VALUE 'ASSET_UPDATED';
ALTER TYPE "SecurityEventType" ADD VALUE 'ASSET_DELETED';
ALTER TYPE "SecurityEventType" ADD VALUE 'ACCOUNT_CREATED';
ALTER TYPE "SecurityEventType" ADD VALUE 'ACCOUNT_UPDATED';
ALTER TYPE "SecurityEventType" ADD VALUE 'ACCOUNT_DELETED';
ALTER TYPE "SecurityEventType" ADD VALUE 'TRANSACTION_INITIATED';
ALTER TYPE "SecurityEventType" ADD VALUE 'TRANSACTION_COMPLETED';
ALTER TYPE "SecurityEventType" ADD VALUE 'TRANSACTION_FAILED';
ALTER TYPE "SecurityEventType" ADD VALUE 'LOAN_APPROVED';
ALTER TYPE "SecurityEventType" ADD VALUE 'LOAN_REJECTED';
ALTER TYPE "SecurityEventType" ADD VALUE 'LOAN_REPAID';
ALTER TYPE "SecurityEventType" ADD VALUE 'INVESTMENT_CREATED';
ALTER TYPE "SecurityEventType" ADD VALUE 'INVESTMENT_UPDATED';
ALTER TYPE "SecurityEventType" ADD VALUE 'INVESTMENT_CLOSED';
