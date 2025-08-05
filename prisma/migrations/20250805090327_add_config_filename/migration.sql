/*
  Warnings:

  - A unique constraint covering the columns `[filename]` on the table `Config` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."Config" ADD COLUMN     "filename" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Config_filename_key" ON "public"."Config"("filename");
