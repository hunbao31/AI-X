-- Community forum: image Q&A posts, answers, and upvotes. Fully additive —
-- three new tables, no changes to existing ones.

-- CreateTable
CREATE TABLE "ForumPost" (
    "id" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "imageHash" TEXT NOT NULL,
    "description" TEXT,
    "authorId" TEXT NOT NULL,
    "topicId" TEXT,
    "classId" TEXT,
    "answerCount" INTEGER NOT NULL DEFAULT 0,
    "rewardScore" INTEGER NOT NULL DEFAULT 0,
    "hasAcceptedAnswer" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ForumPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForumAnswer" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "imageUrl" TEXT,
    "authorId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "isAccepted" BOOLEAN NOT NULL DEFAULT false,
    "upvoteCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ForumAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForumAnswerUpvote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "answerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ForumAnswerUpvote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ForumPost_classId_createdAt_idx" ON "ForumPost"("classId", "createdAt");

-- CreateIndex
CREATE INDEX "ForumPost_classId_answerCount_idx" ON "ForumPost"("classId", "answerCount");

-- CreateIndex
CREATE INDEX "ForumPost_classId_rewardScore_idx" ON "ForumPost"("classId", "rewardScore");

-- CreateIndex
CREATE INDEX "ForumPost_topicId_idx" ON "ForumPost"("topicId");

-- CreateIndex
CREATE INDEX "ForumPost_authorId_createdAt_idx" ON "ForumPost"("authorId", "createdAt");

-- CreateIndex
CREATE INDEX "ForumPost_authorId_imageHash_idx" ON "ForumPost"("authorId", "imageHash");

-- CreateIndex
CREATE INDEX "ForumAnswer_postId_isAccepted_upvoteCount_idx" ON "ForumAnswer"("postId", "isAccepted", "upvoteCount");

-- CreateIndex
CREATE INDEX "ForumAnswer_authorId_createdAt_idx" ON "ForumAnswer"("authorId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ForumAnswerUpvote_userId_answerId_key" ON "ForumAnswerUpvote"("userId", "answerId");

-- CreateIndex
CREATE INDEX "ForumAnswerUpvote_answerId_idx" ON "ForumAnswerUpvote"("answerId");

-- AddForeignKey
ALTER TABLE "ForumPost" ADD CONSTRAINT "ForumPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumPost" ADD CONSTRAINT "ForumPost_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumPost" ADD CONSTRAINT "ForumPost_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumAnswer" ADD CONSTRAINT "ForumAnswer_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumAnswer" ADD CONSTRAINT "ForumAnswer_postId_fkey" FOREIGN KEY ("postId") REFERENCES "ForumPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumAnswerUpvote" ADD CONSTRAINT "ForumAnswerUpvote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumAnswerUpvote" ADD CONSTRAINT "ForumAnswerUpvote_answerId_fkey" FOREIGN KEY ("answerId") REFERENCES "ForumAnswer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
