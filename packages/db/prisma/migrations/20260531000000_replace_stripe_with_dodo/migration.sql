-- Replace Stripe with Dodo Payments + new plan tiers (FREE, STARTER, PRO)

-- Step 1: Add new PlanTier values
ALTER TYPE "PlanTier" ADD VALUE IF NOT EXISTS 'FREE';
ALTER TYPE "PlanTier" ADD VALUE IF NOT EXISTS 'STARTER';

-- Step 2: Migrate existing plan data before removing old enum values
UPDATE "plans" SET "tier" = 'STARTER' WHERE "tier" = 'DEVELOPER';
UPDATE "plans" SET "tier" = 'PRO'     WHERE "tier" = 'ENTERPRISE';

-- Step 3: Replace old enum type (Postgres requires creating a new type to drop values)
ALTER TABLE "plans" ALTER COLUMN "tier" TYPE TEXT;

-- Drop old type and recreate with only FREE/STARTER/PRO
DROP TYPE "PlanTier";
CREATE TYPE "PlanTier" AS ENUM ('FREE', 'STARTER', 'PRO');

-- Cast column back to new enum
ALTER TABLE "plans" ALTER COLUMN "tier" TYPE "PlanTier" USING "tier"::"PlanTier";

-- Step 4: Rename Stripe columns to Dodo on subscriptions table
ALTER TABLE "subscriptions"
  RENAME COLUMN "stripe_customer_id" TO "dodo_customer_id";

ALTER TABLE "subscriptions"
  RENAME COLUMN "stripe_subscription_id" TO "dodo_subscription_id";

-- Step 5: Recreate unique constraints with new names
ALTER TABLE "subscriptions" DROP CONSTRAINT IF EXISTS "subscriptions_stripe_customer_id_key";
ALTER TABLE "subscriptions" DROP CONSTRAINT IF EXISTS "subscriptions_stripe_subscription_id_key";
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_dodo_customer_id_key"     UNIQUE ("dodo_customer_id");
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_dodo_subscription_id_key" UNIQUE ("dodo_subscription_id");
