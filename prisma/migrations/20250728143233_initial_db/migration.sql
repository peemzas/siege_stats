-- CreateTable
CREATE TABLE "LogEntry" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "logDate" TIMESTAMP(3) NOT NULL,
    "rawLog" TEXT NOT NULL,
    "parsedData" JSONB NOT NULL,
    "title" TEXT,

    CONSTRAINT "LogEntry_pkey" PRIMARY KEY ("id")
);
