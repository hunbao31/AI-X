-- CreateEnum
CREATE TYPE "DiagnosticDifficulty" AS ENUM ('de', 'trung_binh', 'kho');

-- CreateTable
CREATE TABLE "DiagnosticExercise" (
    "id" TEXT NOT NULL,
    "skillCode" TEXT NOT NULL,
    "difficulty" "DiagnosticDifficulty" NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiagnosticExercise_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DiagnosticExercise_skillCode_idx" ON "DiagnosticExercise"("skillCode");

-- AddForeignKey
ALTER TABLE "DiagnosticExercise" ADD CONSTRAINT "DiagnosticExercise_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
