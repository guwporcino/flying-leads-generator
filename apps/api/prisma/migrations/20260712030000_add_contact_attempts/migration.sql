-- CreateEnum
CREATE TYPE "ContactChannel" AS ENUM ('whatsapp_api', 'manual_link');

-- CreateEnum
CREATE TYPE "ContactAttemptStatus" AS ENUM ('sent', 'failed');

-- CreateTable
CREATE TABLE "contact_attempts" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "channel" "ContactChannel" NOT NULL,
    "status" "ContactAttemptStatus" NOT NULL,
    "providerMessageId" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contact_attempts_leadId_idx" ON "contact_attempts"("leadId");

-- AddForeignKey
ALTER TABLE "contact_attempts" ADD CONSTRAINT "contact_attempts_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
