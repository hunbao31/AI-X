-- CreateEnum
CREATE TYPE "DiagnosticAnswerType" AS ENUM ('mcq', 'tu_luan');

-- AlterTable
ALTER TABLE "DiagnosticAttempt" ADD COLUMN     "needsTeacherReview" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedBy" TEXT,
ADD COLUMN     "similarityScore" DOUBLE PRECISION,
ADD COLUMN     "teacherReviewedCorrect" BOOLEAN,
ALTER COLUMN "correct" DROP NOT NULL;

-- AlterTable
ALTER TABLE "DiagnosticExercise" ADD COLUMN     "answerType" "DiagnosticAnswerType" NOT NULL DEFAULT 'mcq',
ADD COLUMN     "dapAnMau" TEXT,
ALTER COLUMN "answer" DROP NOT NULL,
ALTER COLUMN "options" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "DiagnosticAttempt_needsTeacherReview_idx" ON "DiagnosticAttempt"("needsTeacherReview");

-- AddForeignKey
ALTER TABLE "DiagnosticAttempt" ADD CONSTRAINT "DiagnosticAttempt_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
