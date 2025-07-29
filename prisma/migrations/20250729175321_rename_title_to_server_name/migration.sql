/*
  Warnings:

  - You are about to drop the column `title` on the `LogEntry` table. All the data in the column will be lost.
  - Added the required column `serverName` to the `LogEntry` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "LogEntry" DROP COLUMN "title",
ADD COLUMN     "serverName" TEXT NOT NULL;
