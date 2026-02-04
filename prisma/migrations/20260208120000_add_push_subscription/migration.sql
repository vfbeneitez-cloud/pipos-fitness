-- AlterTable Notification: add push delivery fields
ALTER TABLE "Notification" ADD COLUMN "pushStatus" TEXT;
ALTER TABLE "Notification" ADD COLUMN "pushSentAt" TIMESTAMP(3);
ALTER TABLE "Notification" ADD COLUMN "pushError" TEXT;
ALTER TABLE "Notification" ADD COLUMN "pushAttemptCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable UserProfile: add push preferences
ALTER TABLE "UserProfile" ADD COLUMN "pushNotificationsEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "UserProfile" ADD COLUMN "pushQuietHoursStartUtc" INTEGER NOT NULL DEFAULT 22;
ALTER TABLE "UserProfile" ADD COLUMN "pushQuietHoursEndUtc" INTEGER NOT NULL DEFAULT 7;

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");
CREATE INDEX "PushSubscription_userId_createdAt_idx" ON "PushSubscription"("userId", "createdAt");

ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
