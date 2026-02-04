-- CreateTable
CREATE TABLE "WeeklyAdherenceSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trainingPercent" INTEGER NOT NULL,
    "nutritionPercent" INTEGER NOT NULL,
    "totalPercent" INTEGER NOT NULL,
    "breakdownJson" JSONB NOT NULL,

    CONSTRAINT "WeeklyAdherenceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyAdherenceSnapshot_userId_weekStart_key" ON "WeeklyAdherenceSnapshot"("userId", "weekStart");

-- CreateIndex
CREATE INDEX "WeeklyAdherenceSnapshot_userId_weekStart_idx" ON "WeeklyAdherenceSnapshot"("userId", "weekStart");

-- AddForeignKey
ALTER TABLE "WeeklyAdherenceSnapshot" ADD CONSTRAINT "WeeklyAdherenceSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
