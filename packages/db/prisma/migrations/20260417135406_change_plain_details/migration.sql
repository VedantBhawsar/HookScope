/*
  Warnings:

  - The values [FREE] on the enum `PlanTier` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PlanTier_new" AS ENUM ('DEVELOPER', 'PRO', 'ENTERPRISE');
ALTER TABLE "plans" ALTER COLUMN "tier" TYPE "PlanTier_new" USING ("tier"::text::"PlanTier_new");
ALTER TYPE "PlanTier" RENAME TO "PlanTier_old";
ALTER TYPE "PlanTier_new" RENAME TO "PlanTier";
DROP TYPE "public"."PlanTier_old";
COMMIT;
