-- Product features: question bank tags, quiz modes/shuffle/publish/access
-- codes, resumable attempts (auto-save), favorites, notifications.
-- Additive except one index swap on QuizAttempt; no data is dropped.

-- CreateEnum
CREATE TYPE "QuizMode" AS ENUM ('practice', 'exam');

-- AlterTable: Exercise
ALTER TABLE "Exercise" ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- AlterTable: ExerciseSet
ALTER TABLE "ExerciseSet" ADD COLUMN "accessCode" TEXT;
ALTER TABLE "ExerciseSet" ADD COLUMN "isPublished" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "ExerciseSet" ADD COLUMN "mode" "QuizMode" NOT NULL DEFAULT 'practice';
ALTER TABLE "ExerciseSet" ADD COLUMN "shuffleQuestions" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ExerciseSet" ADD COLUMN "shuffleAnswers" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ExerciseSet" ADD COLUMN "totalTimeLimit" INTEGER;

-- AlterTable: QuizAttempt (auto-save/resume state)
ALTER TABLE "QuizAttempt" ADD COLUMN "answers" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "QuizAttempt" ADD COLUMN "lastQuestionIndex" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "QuizAttempt" ADD COLUMN "durationSeconds" INTEGER;

-- Index swap: userId → (userId, completedAt) for "continue learning" lookups.
DROP INDEX "QuizAttempt_userId_idx";
CREATE INDEX "QuizAttempt_userId_completedAt_idx" ON "QuizAttempt"("userId", "completedAt");

-- CreateTable
CREATE TABLE "FavoriteQuestion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FavoriteQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FavoriteQuestion_userId_exerciseId_key" ON "FavoriteQuestion"("userId", "exerciseId");

-- CreateIndex
CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "FavoriteQuestion" ADD CONSTRAINT "FavoriteQuestion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteQuestion" ADD CONSTRAINT "FavoriteQuestion_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
