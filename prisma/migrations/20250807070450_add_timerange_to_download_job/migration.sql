-- AlterTable
ALTER TABLE "public"."DataDownloadJob" ADD COLUMN     "timerangeEnd" TIMESTAMP(3),
ADD COLUMN     "timerangeStart" TIMESTAMP(3);
