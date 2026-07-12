-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "nextActionAt" TIMESTAMP(3),
ADD COLUMN     "nextActionNote" TEXT;

-- CreateTable
CREATE TABLE "lead_status_events" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "fromStatus" "LeadStatus" NOT NULL,
    "toStatus" "LeadStatus" NOT NULL,
    "changedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_status_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lead_status_events_leadId_idx" ON "lead_status_events"("leadId");

-- CreateIndex
CREATE INDEX "lead_status_events_toStatus_createdAt_idx" ON "lead_status_events"("toStatus", "createdAt");

-- AddForeignKey
ALTER TABLE "lead_status_events" ADD CONSTRAINT "lead_status_events_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
