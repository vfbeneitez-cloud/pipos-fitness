-- AlterTable Notification: add email delivery fields
ALTER TABLE "Notification" ADD COLUMN "emailStatus" TEXT;
ALTER TABLE "Notification" ADD COLUMN "emailSentAt" TIMESTAMP(3);
ALTER TABLE "Notification" ADD COLUMN "emailError" TEXT;
ALTER TABLE "Notification" ADD COLUMN "emailAttemptCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable UserProfile: add email notification preferences
ALTER TABLE "UserProfile" ADD COLUMN "emailNotificationsEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "UserProfile" ADD COLUMN "emailNotificationHourUtc" INTEGER NOT NULL DEFAULT 9;
