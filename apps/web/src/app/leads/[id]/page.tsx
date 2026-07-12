import { notFound } from 'next/navigation';
import type { Company, Lead, OpportunityScore, WebsiteAudit } from '@flying-leads/shared-types';
import { LeadDetail } from './lead-detail';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export type LeadWithCompany = Lead & {
  company: Company & {
    opportunityScore: OpportunityScore | null;
    websiteAudit: WebsiteAudit | null;
  };
};

async function getLead(id: string): Promise<LeadWithCompany | null> {
  const response = await fetch(`${API_URL}/leads/${id}`, { cache: 'no-store' });
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`Falha ao carregar lead (status ${response.status})`);
  }
  return response.json() as Promise<LeadWithCompany>;
}

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = await getLead(id);
  if (!lead) {
    notFound();
  }

  return <LeadDetail lead={lead} />;
}
