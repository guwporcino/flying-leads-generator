import { Job } from 'bullmq';
import { Company } from '@prisma/client';
import { WebsiteGenerationProcessor } from './website-generation.processor';
import { PrismaService } from '../prisma/prisma.service';
import { ContentGeneratorService } from './content-generator/content-generator.service';
import { GitHubDeployService } from './github-deploy/github-deploy.service';
import { VercelDeployService } from './vercel-deploy/vercel-deploy.service';
import { ApproachMessageService } from './approach-message/approach-message.service';
import { WebsiteGenerationJobData, GeneratedSiteContent } from './website-generation.types';

function buildCompany(overrides: Partial<Company> = {}): Company {
  return {
    id: 'company-1',
    campaignId: 'campaign-1',
    name: 'Clínica Sorriso',
    phone: '(31) 3333-4444',
    whatsapp: '5531999998888',
    website: null,
    category: 'dentist',
    openingHours: null,
    reviewCount: 20,
    rating: 4.5,
    photos: [],
    description: null,
    latitude: 0,
    longitude: 0,
    googleMapsUrl: 'https://maps.google.com/?cid=1',
    googlePlaceId: 'places/1',
    createdAt: new Date(),
    ...overrides,
  };
}

function buildContent(): GeneratedSiteContent {
  return {
    seoTitle: 'Clínica Sorriso',
    seoDescription: 'Odontologia em BH',
    heroHeadline: 'Seu sorriso',
    heroSubheadline: 'Cuidamos de você',
    aboutText: 'Referência na região.',
    services: ['Limpeza', 'Clareamento', 'Ortodontia'],
    ctaText: 'Fale conosco',
  };
}

describe('WebsiteGenerationProcessor', () => {
  let processor: WebsiteGenerationProcessor;
  let prisma: {
    company: { findUniqueOrThrow: jest.Mock };
    lead: { upsert: jest.Mock };
  };
  let contentGenerator: { generate: jest.Mock };
  let github: { commitFiles: jest.Mock };
  let vercel: { deploy: jest.Mock };
  let approachMessage: { generate: jest.Mock };

  beforeEach(() => {
    prisma = {
      company: { findUniqueOrThrow: jest.fn() },
      lead: { upsert: jest.fn() },
    };
    contentGenerator = { generate: jest.fn() };
    github = { commitFiles: jest.fn() };
    vercel = { deploy: jest.fn() };
    approachMessage = { generate: jest.fn() };
    processor = new WebsiteGenerationProcessor(
      prisma as unknown as PrismaService,
      contentGenerator as unknown as ContentGeneratorService,
      github as unknown as GitHubDeployService,
      vercel as unknown as VercelDeployService,
      approachMessage as unknown as ApproachMessageService,
    );
  });

  it('generates content, commits the site, deploys it, writes the approach message, and persists the Lead', async () => {
    prisma.company.findUniqueOrThrow.mockResolvedValue({
      ...buildCompany(),
      websiteAudit: { hasWebsite: false, aiGrade: null },
    });
    contentGenerator.generate.mockResolvedValue(buildContent());
    github.commitFiles.mockResolvedValue({
      commitSha: 'abc123',
      commitUrl: 'https://github.com/x/y/commit/abc123',
    });
    vercel.deploy.mockResolvedValue({
      deploymentId: 'dpl_1',
      previewUrl: 'https://clinica-sorriso-abc123.vercel.app',
    });
    approachMessage.generate.mockResolvedValue('Oi! Preparamos um site novo pra você conferir.');

    const job = { data: { companyId: 'company-1' } } as Job<WebsiteGenerationJobData>;
    await processor.process(job);

    expect(approachMessage.generate).toHaveBeenCalledWith({
      companyName: 'Clínica Sorriso',
      category: 'dentist',
      hasWebsite: false,
      websiteGrade: null,
      previewUrl: 'https://clinica-sorriso-abc123.vercel.app',
    });
    expect(prisma.lead.upsert).toHaveBeenCalledWith({
      where: { companyId: 'company-1' },
      create: {
        companyId: 'company-1',
        previewUrl: 'https://clinica-sorriso-abc123.vercel.app',
        approachMessage: 'Oi! Preparamos um site novo pra você conferir.',
      },
      update: {
        previewUrl: 'https://clinica-sorriso-abc123.vercel.app',
        approachMessage: 'Oi! Preparamos um site novo pra você conferir.',
      },
    });
  });
});
