-- CreateEnum
CREATE TYPE "PriorityTier" AS ENUM ('cao', 'trung_binh', 'thap');

-- CreateTable
CREATE TABLE "SkillCatalog" (
    "id" TEXT NOT NULL,
    "skillCode" TEXT NOT NULL,
    "vnName" TEXT NOT NULL,
    "chuongSgk" TEXT NOT NULL,
    "baiSgk" INTEGER NOT NULL,
    "priorityTier" "PriorityTier" NOT NULL,
    "needsVnName" BOOLEAN NOT NULL DEFAULT false,
    "prereqCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SkillCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SkillCatalog_skillCode_key" ON "SkillCatalog"("skillCode");

-- CreateIndex
CREATE INDEX "SkillCatalog_baiSgk_idx" ON "SkillCatalog"("baiSgk");

-- CreateIndex
CREATE INDEX "SkillCatalog_priorityTier_idx" ON "SkillCatalog"("priorityTier");
