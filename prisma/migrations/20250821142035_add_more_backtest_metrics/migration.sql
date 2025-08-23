/*
  Warnings:

  - The `status` column on the `HyperoptTask` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `spaces` column on the `HyperoptTask` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `status` on the `BacktestTask` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `status` on the `DataDownloadJob` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "public"."BacktestStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."HyperoptStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."DataDownloadStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "public"."BacktestTask" ADD COLUMN     "avgProfit" DOUBLE PRECISION,
ADD COLUMN     "avgTradeDuration" DOUBLE PRECISION,
ADD COLUMN     "cagr" DOUBLE PRECISION,
ADD COLUMN     "calmar" DOUBLE PRECISION,
ADD COLUMN     "candleDataFile" TEXT,
ADD COLUMN     "dataDownloadJobId" TEXT,
ADD COLUMN     "expectancy" DOUBLE PRECISION,
ADD COLUMN     "marketChange" DOUBLE PRECISION,
ADD COLUMN     "maxDrawdown" DOUBLE PRECISION,
ADD COLUMN     "profitFactor" DOUBLE PRECISION,
ADD COLUMN     "sharpe" DOUBLE PRECISION,
ADD COLUMN     "sortino" DOUBLE PRECISION,
ADD COLUMN     "totalTrades" INTEGER,
ADD COLUMN     "totalVolume" DOUBLE PRECISION,
DROP COLUMN "status",
ADD COLUMN     "status" "public"."BacktestStatus" NOT NULL;

-- AlterTable
ALTER TABLE "public"."DataDownloadJob" DROP COLUMN "status",
ADD COLUMN     "status" "public"."DataDownloadStatus" NOT NULL;

-- AlterTable
ALTER TABLE "public"."HyperoptTask" DROP COLUMN "status",
ADD COLUMN     "status" "public"."HyperoptStatus" NOT NULL DEFAULT 'PENDING',
DROP COLUMN "spaces",
ADD COLUMN     "spaces" TEXT[];

-- CreateIndex
CREATE INDEX "BacktestTask_status_idx" ON "public"."BacktestTask"("status");

-- CreateIndex
CREATE INDEX "BacktestTask_strategyId_idx" ON "public"."BacktestTask"("strategyId");

-- CreateIndex
CREATE INDEX "BacktestTask_configId_idx" ON "public"."BacktestTask"("configId");

-- CreateIndex
CREATE INDEX "DataDownloadJob_status_idx" ON "public"."DataDownloadJob"("status");

-- CreateIndex
CREATE INDEX "HyperoptTask_status_idx" ON "public"."HyperoptTask"("status");

-- CreateIndex
CREATE INDEX "HyperoptTask_strategyId_idx" ON "public"."HyperoptTask"("strategyId");

-- CreateIndex
CREATE INDEX "HyperoptTask_configId_idx" ON "public"."HyperoptTask"("configId");

-- CreateIndex
CREATE INDEX "Trade_pair_idx" ON "public"."Trade"("pair");

-- CreateIndex
CREATE INDEX "Trade_open_date_idx" ON "public"."Trade"("open_date");

-- CreateIndex
CREATE INDEX "Trade_close_date_idx" ON "public"."Trade"("close_date");

-- CreateIndex
CREATE INDEX "Trade_backtestTaskId_idx" ON "public"."Trade"("backtestTaskId");
