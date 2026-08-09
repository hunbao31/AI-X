-- Platform upgrade: classes, topics, quiz sets, user settings.
-- Hand-written instead of auto-generated so existing User rows survive the
-- new required unique "username" column (backfilled from email below).

-- AlterEnum: admin role (PG >= 12 allows ADD VALUE inside a transaction as
-- long as the new value is not used in the same transaction — it isn't).
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'admin';

-- CreateEnum
CREATE TYPE "Theme" AS ENUM ('light', 'dark');

-- AlterTable: User — username (backfilled from email, then locked down),
-- optional email, theme setting.
ALTER TABLE "User" ADD COLUMN "username" TEXT;
UPDATE "User" SET "username" = "email" WHERE "username" IS NULL;
ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;
ALTER TABLE "User" ADD COLUMN "theme" "Theme" NOT NULL DEFAULT 'dark';

-- AlterTable: Exercise — optional link to a class Topic.
ALTER TABLE "Exercise" ADD COLUMN "topicId" TEXT;

-- AlterTable: Mastery — updatedAt (default so existing rows pass NOT NULL)
-- and informational topicId.
ALTER TABLE "Mastery" ADD COLUMN "topicId" TEXT;
ALTER TABLE "Mastery" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "Class" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Class_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassMember" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'student',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Topic" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Topic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExerciseSet" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "classId" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "timeLimitPerQuestion" INTEGER,
    "roomCode" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExerciseSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExerciseSetItem" (
    "id" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "ExerciseSetItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizAttempt" (
    "id" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "totalCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "QuizAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Class_code_key" ON "Class"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ClassMember_userId_classId_key" ON "ClassMember"("userId", "classId");

-- CreateIndex
CREATE INDEX "ClassMember_classId_idx" ON "ClassMember"("classId");

-- CreateIndex
CREATE UNIQUE INDEX "Topic_classId_name_key" ON "Topic"("classId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ExerciseSet_roomCode_key" ON "ExerciseSet"("roomCode");

-- CreateIndex
CREATE UNIQUE INDEX "ExerciseSetItem_setId_exerciseId_key" ON "ExerciseSetItem"("setId", "exerciseId");

-- CreateIndex
CREATE INDEX "ExerciseSetItem_setId_order_idx" ON "ExerciseSetItem"("setId", "order");

-- CreateIndex
CREATE INDEX "QuizAttempt_setId_score_idx" ON "QuizAttempt"("setId", "score");

-- CreateIndex
CREATE INDEX "QuizAttempt_userId_idx" ON "QuizAttempt"("userId");

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassMember" ADD CONSTRAINT "ClassMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassMember" ADD CONSTRAINT "ClassMember_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Topic" ADD CONSTRAINT "Topic_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseSet" ADD CONSTRAINT "ExerciseSet_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseSet" ADD CONSTRAINT "ExerciseSet_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseSetItem" ADD CONSTRAINT "ExerciseSetItem_setId_fkey" FOREIGN KEY ("setId") REFERENCES "ExerciseSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseSetItem" ADD CONSTRAINT "ExerciseSetItem_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_setId_fkey" FOREIGN KEY ("setId") REFERENCES "ExerciseSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
