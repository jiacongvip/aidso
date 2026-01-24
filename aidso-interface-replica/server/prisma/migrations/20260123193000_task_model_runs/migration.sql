-- CreateEnum
CREATE TYPE "TaskModelRunPurpose" AS ENUM ('MODEL', 'ANALYSIS');

-- CreateEnum
CREATE TYPE "TaskModelRunStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED');

-- CreateTable
CREATE TABLE "TaskModelRun" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "modelKey" TEXT NOT NULL,
    "provider" TEXT,
    "modelName" TEXT,
    "purpose" "TaskModelRunPurpose" NOT NULL DEFAULT 'MODEL',
    "status" "TaskModelRunStatus" NOT NULL DEFAULT 'PENDING',
    "prompt" TEXT,
    "responseText" TEXT,
    "responseJson" JSONB,
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskModelRun_pkey" PRIMARY KEY ("id")
);

-- Index
CREATE INDEX "TaskModelRun_taskId_createdAt_idx" ON "TaskModelRun"("taskId", "createdAt");

-- AddForeignKey
ALTER TABLE "TaskModelRun" ADD CONSTRAINT "TaskModelRun_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

