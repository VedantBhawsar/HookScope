-- AlterTable
ALTER TABLE "users" ADD COLUMN     "company_name" TEXT,
ADD COLUMN     "company_role" TEXT,
ADD COLUMN     "company_size" TEXT,
ADD COLUMN     "email_verified_at" TIMESTAMP(3),
ADD COLUMN     "onboarding_completed_at" TIMESTAMP(3),
ADD COLUMN     "use_case" TEXT;
