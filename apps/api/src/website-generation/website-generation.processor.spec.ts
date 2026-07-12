import { Job } from 'bullmq';
import { Company } from '@prisma/client';
import { WebsiteGenerationProcessor } from './website-generation.processor';
import { PrismaService } from '../prisma/prisma.service';
import { ContentGeneratorService } from './content-generator/content-generator.service';
import { GitHubDeployService } from './github-deploy/github-deploy.service';
import { VercelDeployService } from './vercel-deploy/vercel-deploy.service';
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

  beforeEach(() => {
    prisma = {
      company: { findUniqueOrThrow: jest.fn() },
      lead: { upsert: jest.fn() },
    };
    contentGenerator = { generate: jest.fn() };
    github = { commitFiles: jest.fn() };
    vercel = { deploy: jest.fn() };
    processor = new WebsiteGenerationProcessor(
      prisma as unknown as PrismaService,
      contentGenerator as unknown as ContentGeneratorService,
      github as unknown as GitHubDeployService,
      vercel as unknown as VercelDeployService,
    );
  });

  it('generates content, commits the site, deploys it, and persists the Lead preview URL', async () => {
    prisma.company.findUniqueOrThrow.mockResolvedValue(buildCompany());
    contentGenerator.generate.mockResolvedValue(buildContent());
    github.commitFiles.mockResolvedValue({
      commitSha: 'abc123',
      commitUrl: 'https://github.com/x/y/commit/abc123',
    });
    vercel.deploy.mockResolvedValue({
      deploymentId: 'dpl_1',
      previewUrl: 'https://clinica-sorriso-abc123.vercel.app',
    });

    const job = { data: { companyId: 'company-1' } } as Job<WebsiteGenerationJobData>;
    await processor.process(job);

    expect(contentGenerator.generate).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'company-1', name: 'Clínica Sorriso' }),
    );
    expect(github.commitFiles).toHaveBeenCalledWith(
      expect.stringMatching(/^sites\/clinica-sorriso-/),
      expect.any(Array),
      expect.stringContaining('Clínica Sorriso'),
    );
    expect(vercel.deploy).toHaveBeenCalled();
    expect(prisma.lead.upsert).toHaveBeenCalledWith({
      where: { companyId: 'company-1' },
      create: { companyId: 'company-1', previewUrl: 'https://clinica-sorriso-abc123.vercel.app' },
      update: { previewUrl: 'https://clinica-sorriso-abc123.vercel.app' },
    });
  });
});
