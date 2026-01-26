-- CreateTable
CREATE TABLE "MonitoringProject" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "brandName" TEXT NOT NULL,
    "brandWebsiteUrl" TEXT,
    "monitorKeywords" TEXT[],
    "competitors" TEXT[],
    "negativeKeywords" TEXT[],
    "selectedModels" JSONB,
    "searchType" TEXT NOT NULL DEFAULT 'quick',
    "intervalMinutes" INTEGER NOT NULL DEFAULT 1440,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "lastRunAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonitoringProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonitoringTrackedWork" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MonitoringTrackedWork_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Task" ADD COLUMN "monitoringProjectId" TEXT;

-- CreateIndex
CREATE INDEX "MonitoringProject_userId_enabled_idx" ON "MonitoringProject"("userId", "enabled");

-- CreateIndex
CREATE INDEX "MonitoringProject_nextRunAt_idx" ON "MonitoringProject"("nextRunAt");

-- CreateIndex
CREATE INDEX "MonitoringTrackedWork_projectId_createdAt_idx" ON "MonitoringTrackedWork"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Task_monitoringProjectId_createdAt_idx" ON "Task"("monitoringProjectId", "createdAt");

-- AddForeignKey
ALTER TABLE "MonitoringProject" ADD CONSTRAINT "MonitoringProject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonitoringTrackedWork" ADD CONSTRAINT "MonitoringTrackedWork_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "MonitoringProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_monitoringProjectId_fkey" FOREIGN KEY ("monitoringProjectId") REFERENCES "MonitoringProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

