-- Add billing-related fields to Task for per-day quota and cost calculation
ALTER TABLE "Task" ADD COLUMN "searchType" TEXT NOT NULL DEFAULT 'quick';
ALTER TABLE "Task" ADD COLUMN "selectedModels" JSONB;
ALTER TABLE "Task" ADD COLUMN "costUnits" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Task" ADD COLUMN "usageDate" TEXT;

-- Helps querying daily usage per user
CREATE INDEX "Task_userId_usageDate_idx" ON "Task"("userId", "usageDate");

