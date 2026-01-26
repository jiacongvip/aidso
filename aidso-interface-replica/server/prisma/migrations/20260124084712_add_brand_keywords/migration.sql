-- CreateTable
CREATE TABLE "BrandKeyword" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "keyword" TEXT NOT NULL,
    "aliases" TEXT[],
    "category" TEXT,
    "isOwn" BOOLEAN NOT NULL DEFAULT true,
    "color" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandKeyword_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandMention" (
    "id" SERIAL NOT NULL,
    "brandKeywordId" INTEGER NOT NULL,
    "taskId" TEXT NOT NULL,
    "modelKey" TEXT NOT NULL,
    "mentionCount" INTEGER NOT NULL DEFAULT 1,
    "rank" INTEGER,
    "sentiment" TEXT,
    "context" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrandMention_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BrandKeyword_userId_enabled_idx" ON "BrandKeyword"("userId", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "BrandKeyword_userId_keyword_key" ON "BrandKeyword"("userId", "keyword");

-- CreateIndex
CREATE INDEX "BrandMention_brandKeywordId_createdAt_idx" ON "BrandMention"("brandKeywordId", "createdAt");

-- CreateIndex
CREATE INDEX "BrandMention_taskId_modelKey_idx" ON "BrandMention"("taskId", "modelKey");

-- AddForeignKey
ALTER TABLE "BrandKeyword" ADD CONSTRAINT "BrandKeyword_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandMention" ADD CONSTRAINT "BrandMention_brandKeywordId_fkey" FOREIGN KEY ("brandKeywordId") REFERENCES "BrandKeyword"("id") ON DELETE CASCADE ON UPDATE CASCADE;
