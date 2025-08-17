-- AlterTable
ALTER TABLE "public"."BacktestTask" ADD COLUMN     "sourceHyperoptTaskId" TEXT;

-- CreateTable
CREATE TABLE "public"."Trade" (
    "id" TEXT NOT NULL,
    "pair" TEXT NOT NULL,
    "open_date" TIMESTAMP(3) NOT NULL,
    "close_date" TIMESTAMP(3) NOT NULL,
    "profit_abs" DOUBLE PRECISION NOT NULL,
    "profit_pct" DOUBLE PRECISION NOT NULL,
    "open_rate" DOUBLE PRECISION NOT NULL,
    "close_rate" DOUBLE PRECISION NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "stake_amount" DOUBLE PRECISION NOT NULL,
    "trade_duration" INTEGER NOT NULL,
    "exit_reason" TEXT NOT NULL,
    "backtestTaskId" TEXT NOT NULL,

    CONSTRAINT "Trade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."HyperoptTask" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "epochs" INTEGER NOT NULL,
    "spaces" TEXT NOT NULL,
    "lossFunction" TEXT NOT NULL,
    "timerange" TEXT,
    "jobWorkers" INTEGER,
    "jobId" TEXT,
    "duration" DOUBLE PRECISION,
    "strategyId" INTEGER NOT NULL,
    "configId" INTEGER NOT NULL,
    "bestResult" JSONB,
    "resultsPath" TEXT,
    "logPath" TEXT,
    "logs" TEXT,

    CONSTRAINT "HyperoptTask_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."BacktestTask" ADD CONSTRAINT "BacktestTask_sourceHyperoptTaskId_fkey" FOREIGN KEY ("sourceHyperoptTaskId") REFERENCES "public"."HyperoptTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Trade" ADD CONSTRAINT "Trade_backtestTaskId_fkey" FOREIGN KEY ("backtestTaskId") REFERENCES "public"."BacktestTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HyperoptTask" ADD CONSTRAINT "HyperoptTask_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "public"."Strategy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HyperoptTask" ADD CONSTRAINT "HyperoptTask_configId_fkey" FOREIGN KEY ("configId") REFERENCES "public"."Config"("id") ON DELETE CASCADE ON UPDATE CASCADE;
