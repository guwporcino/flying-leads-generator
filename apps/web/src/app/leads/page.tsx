import Link from 'next/link';
import type { Company, Lead, OpportunityScore } from '@flying-leads/shared-types';
import { Badge } from '@/components/ui/badge';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

type LeadWithCompany = Lead & {
  company: Company & { opportunityScore: OpportunityScore | null };
};

const STATUS_LABEL: Record<string, string> = {
  not_sent: 'Não enviado',
  sent: 'Enviado',
  viewed: 'Visualizou',
  replied: 'Respondeu',
  interested: 'Interessado',
  meeting: 'Reunião',
  customer: 'Cliente',
  lost: 'Perdido',
};

async function getLeads(): Promise<LeadWithCompany[]> {
  const response = await fetch(`${API_URL}/leads`, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Falha ao carregar leads (status ${response.status})`);
  }
  return response.json() as Promise<LeadWithCompany[]>;
}

export default async function LeadsPage() {
  const leads = await getLeads();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Fila de aprovação</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {leads.length} lead(s) com site gerado.
        </p>
      </div>

      {leads.length === 0 ? (
        <p className="text-sm text-zinc-500">
          Nenhum site gerado ainda. Gere um site em uma empresa de uma campanha primeiro.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {leads.map((lead) => (
            <Link key={lead.id} href={`/leads/${lead.id}`}>
              <Card className="transition-colors hover:border-zinc-400">
                <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
                  <div>
                    <CardTitle>{lead.company.name}</CardTitle>
                    <CardDescription>
                      {lead.company.category}
                      {lead.company.opportunityScore
                        ? ` · Opportunity Score ${lead.company.opportunityScore.finalScore}`
                        : ' · aguardando avaliação'}
                    </CardDescription>
                  </div>
                  <Badge variant={lead.status === 'not_sent' ? 'outline' : 'secondary'}>
                    {STATUS_LABEL[lead.status] ?? lead.status}
                  </Badge>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
