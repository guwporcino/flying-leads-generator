-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('not_sent', 'sent', 'viewed', 'replied', 'interested', 'meeting', 'customer', 'lost');

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "niche" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "neighborhood" TEXT,
    "postalCode" TEXT,
    "address" TEXT,
    "radiusKm" INTEGER NOT NULL,
    "filters" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "whatsapp" TEXT,
    "website" TEXT,
    "category" TEXT NOT NULL,
    "openingHours" TEXT,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION,
    "photos" TEXT[],
    "description" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "googleMapsUrl" TEXT NOT NULL,
    "googlePlaceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "website_audits" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "hasWebsite" BOOLEAN NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "detectedTechnology" TEXT[],
    "pageCount" INTEGER,
    "performanceScore" INTEGER,
    "seoScore" INTEGER,
    "brokenLinksCount" INTEGER,
    "hasHttps" BOOLEAN,
    "isResponsive" BOOLEAN,
    "loadTimeMs" INTEGER,
    "lastUpdatedDetectedAt" TIMESTAMP(3),
    "copyrightYear" INTEGER,
    "socialLinks" TEXT[],
    "hasContactForm" BOOLEAN,
    "hasMap" BOOLEAN,
    "hasBlog" BOOLEAN,
    "aiCriteriaScores" JSONB,
    "aiGrade" TEXT,
    "aiFindings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "website_audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opportunity_scores" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "ruleBasedScore" INTEGER NOT NULL,
    "aiScore" INTEGER,
    "finalScore" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "opportunity_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "opportunityScoreId" TEXT,
    "previewUrl" TEXT,
    "approachMessage" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'not_sent',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "companies_googlePlaceId_key" ON "companies"("googlePlaceId");

-- CreateIndex
CREATE INDEX "companies_campaignId_idx" ON "companies"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "website_audits_companyId_key" ON "website_audits"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "opportunity_scores_companyId_key" ON "opportunity_scores"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "leads_companyId_key" ON "leads"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "leads_opportunityScoreId_key" ON "leads"("opportunityScoreId");

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "website_audits" ADD CONSTRAINT "website_audits_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunity_scores" ADD CONSTRAINT "opportunity_scores_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_opportunityScoreId_fkey" FOREIGN KEY ("opportunityScoreId") REFERENCES "opportunity_scores"("id") ON DELETE SET NULL ON UPDATE CASCADE;
