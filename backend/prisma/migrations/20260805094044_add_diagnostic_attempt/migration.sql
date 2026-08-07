-- CreateTable
CREATE TABLE "DiagnosticAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "diagnosticExerciseId" TEXT NOT NULL,
    "skillCode" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiagnosticAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DiagnosticAttempt_userId_createdAt_idx" ON "DiagnosticAttempt"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "DiagnosticAttempt_skillCode_idx" ON "DiagnosticAttempt"("skillCode");

-- AddForeignKey
ALTER TABLE "DiagnosticAttempt" ADD CONSTRAINT "DiagnosticAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosticAttempt" ADD CONSTRAINT "DiagnosticAttempt_diagnosticExerciseId_fkey" FOREIGN KEY ("diagnosticExerciseId") REFERENCES "DiagnosticExercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;
