-- CreateTable
CREATE TABLE "public"."MarketData" (
    "id" SERIAL NOT NULL,
    "exchange" TEXT NOT NULL,
    "pair" TEXT NOT NULL,
    "timeframe" TEXT NOT NULL,
    "marketType" TEXT NOT NULL DEFAULT 'spot',
    "status" TEXT NOT NULL DEFAULT 'available',
    "filePath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DataDownloadJob" (
    "id" TEXT NOT NULL,
    "exchange" TEXT NOT NULL,
    "pairs" TEXT[],
    "timeframes" TEXT[],
    "marketType" TEXT NOT NULL DEFAULT 'spot',
    "status" TEXT NOT NULL,
    "logs" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataDownloadJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MarketData_exchange_pair_timeframe_marketType_key" ON "public"."MarketData"("exchange", "pair", "timeframe", "marketType");
