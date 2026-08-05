-- CreateEnum
CREATE TYPE "BookStatus" AS ENUM ('TO_READ', 'READING', 'FINISHED');

-- AlterTable
ALTER TABLE "Book" ADD COLUMN "status" "BookStatus" NOT NULL DEFAULT 'FINISHED';

-- CreateIndex
CREATE INDEX "Book_status_idx" ON "Book"("status");
