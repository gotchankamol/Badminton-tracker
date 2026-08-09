-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "dayResetHour" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "roundStartAt" TIMESTAMP(3);
