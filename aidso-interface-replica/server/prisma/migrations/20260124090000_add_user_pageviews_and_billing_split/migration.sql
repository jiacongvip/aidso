-- Add quota/points split fields to Task
ALTER TABLE "Task" ADD COLUMN "quotaUnits" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Task" ADD COLUMN "pointsUnits" INTEGER NOT NULL DEFAULT 0;

-- Backfill existing tasks: assume historical costUnits were deducted from points
UPDATE "Task"
SET "pointsUnits" = "costUnits"
WHERE "pointsUnits" = 0 AND "costUnits" > 0;

-- CreateTable
CREATE TABLE "UserPageView" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "sessionId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "referrer" TEXT,
    "userAgent" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "durationSeconds" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserPageView_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "UserPageView" ADD CONSTRAINT "UserPageView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Indexes (re-add if missing)
CREATE INDEX IF NOT EXISTS "Task_userId_usageDate_idx" ON "Task"("userId", "usageDate");
CREATE INDEX IF NOT EXISTS "TaskModelRun_taskId_createdAt_idx" ON "TaskModelRun"("taskId", "createdAt");
CREATE INDEX IF NOT EXISTS "PointsLog_userId_createdAt_idx" ON "PointsLog"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "UserPageView_userId_createdAt_idx" ON "UserPageView"("userId", "createdAt");

