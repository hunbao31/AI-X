-- AlterTable
ALTER TABLE "Attempt" ADD COLUMN     "needsTeacherReview" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedBy" TEXT,
ALTER COLUMN "correct" DROP NOT NULL,
ALTER COLUMN "understandingLevel" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Attempt_needsTeacherReview_idx" ON "Attempt"("needsTeacherReview");

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
