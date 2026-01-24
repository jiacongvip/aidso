-- CreateEnum
CREATE TYPE "PointsLogType" AS ENUM ('RECHARGE', 'CONSUME', 'ADMIN_ADD', 'ADMIN_SUB', 'REFUND');

-- DropIndex
DROP INDEX "Task_userId_usageDate_idx";

-- DropIndex
DROP INDEX "TaskModelRun_taskId_createdAt_idx";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "points" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "PointsLog" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "balance" INTEGER NOT NULL,
    "type" "PointsLogType" NOT NULL,
    "description" TEXT,
    "operatorId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointsLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PointsLog" ADD CONSTRAINT "PointsLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
