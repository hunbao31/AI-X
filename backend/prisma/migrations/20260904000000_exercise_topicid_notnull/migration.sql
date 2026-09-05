-- DropForeignKey
ALTER TABLE "Exercise" DROP CONSTRAINT "Exercise_topicId_fkey";

-- AlterTable
ALTER TABLE "Exercise" ALTER COLUMN "topicId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
