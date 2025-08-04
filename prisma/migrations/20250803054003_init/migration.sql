-- CreateTable
CREATE TABLE "public"."Strategy" (
    "id" SERIAL NOT NULL,
    "filename" TEXT NOT NULL,
    "className" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Strategy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Config" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BacktestTask" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "timerangeStart" TIMESTAMP(3),
    "timerangeEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "resultsSummary" JSONB,
    "rawOutputPath" TEXT,
    "logs" TEXT,
    "strategyId" INTEGER NOT NULL,
    "configId" INTEGER,

    CONSTRAINT "BacktestTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Strategy_filename_key" ON "public"."Strategy"("filename");

-- CreateIndex
CREATE UNIQUE INDEX "Config_name_key" ON "public"."Config"("name");

-- AddForeignKey
ALTER TABLE "public"."BacktestTask" ADD CONSTRAINT "BacktestTask_configId_fkey" FOREIGN KEY ("configId") REFERENCES "public"."Config"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BacktestTask" ADD CONSTRAINT "BacktestTask_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "public"."Strategy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
