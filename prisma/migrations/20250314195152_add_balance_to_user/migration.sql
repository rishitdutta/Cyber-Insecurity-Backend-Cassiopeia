-- Add balance column
ALTER TABLE "User" ADD COLUMN "balance" FLOAT NOT NULL DEFAULT 0.0;

-- Add CHECK constraint
ALTER TABLE "User"
ADD CONSTRAINT balance_non_negative CHECK ("balance" >= 0);