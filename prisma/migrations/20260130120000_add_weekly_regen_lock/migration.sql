-- AlterTable
ALTER TABLE "WeeklyPlan" ADD COLUMN "regenLockId" TEXT,
ADD COLUMN "regenLockedAt" TIMESTAMP(3);
