/*
  Warnings:

  - You are about to drop the column `response_body_url` on the `deliveries` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "deliveries" DROP COLUMN "response_body_url",
ADD COLUMN     "response_body" TEXT;

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "status" BOOLEAN NOT NULL DEFAULT true;
