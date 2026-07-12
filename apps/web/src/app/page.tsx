import Link from 'next/link';
import type { DashboardMetrics, LeadStatus } from '@flying-leads/shared-types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

const STATUS_LABEL: Record<LeadStatus, string> = {
  not_sent: 'Não enviado',
  sent: 'Enviado',
  viewed: 'Visualizou',
  replied: 'Respondeu',
  interested: 'Interessado',
  meeting: 'Reunião',
  customer: 'Cliente',
  lost: 'Perdido',
};

const FUNNEL_ORDER: LeadStatus[] = [
  'not_sent',
  'sent',
  'viewed',
  'replied',
  'interested',
  'meeting',
  'customer',
  'lost',
];

async function getMetrics(): Promise<DashboardMetrics> {
  const response = await fetch(`${API_URL}/dashboard/metrics`, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Falha ao carregar métricas (status ${response.status})`);
  }
  return response.json() as Promise<DashboardMetrics>;
}

export default async function DashboardPage() {
  const metrics = await getMetrics();

  const kpis: Array<{ label: string; value: number }> = [
    { label: 'Empresas encontradas', value: metrics.companiesFound },
    { label: 'Oportunidades identificadas', value: metrics.opportunitiesIdentified },
    { label: 'Previews criados', value: metrics.previewsCreated },
    { label: 'Mensagens enviadas', value: metrics.messagesSent },
    { label: 'Respostas', value: metrics.replies },
    { label: 'Reuniões', value: metrics.meetings },
    { label: 'Vendas', value: metrics.sales },
  ];

  const maxFunnelCount = Math.max(1, ...FUNNEL_ORDER.map((status) => metrics.funnel[status]));

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Métricas de hoje ({new Date(metrics.period.from).toLocaleDateString('pt-BR')})
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/campaigns/new"
            className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
          >
            Nova campanha
          </Link>
          <Link
            href="/leads"
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-700"
          >
            Fila de aprovação
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-normal text-zinc-600 dark:text-zinc-400">
                {kpi.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{kpi.value.toLocaleString('pt-BR')}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Funil</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {FUNNEL_ORDER.map((status) => {
            const count = metrics.funnel[status];
            return (
              <div key={status} className="grid grid-cols-[8rem_1fr_3rem] items-center gap-3">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  {STATUS_LABEL[status]}
                </span>
                <div className="h-5 overflow-hidden rounded-r bg-zinc-100 dark:bg-zinc-900">
                  <div
                    className="h-full rounded-r bg-sky-600 dark:bg-sky-500"
                    style={{ width: `${(count / maxFunnelCount) * 100}%` }}
                  />
                </div>
                <span className="text-right text-sm font-medium tabular-nums">
                  {count.toLocaleString('pt-BR')}
                </span>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Follow-ups vencidos</CardTitle>
        </CardHeader>
        <CardContent>
          {metrics.overdueFollowUps.length === 0 ? (
            <p className="text-sm text-zinc-500">Nenhum follow-up pendente. 🎉</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {metrics.overdueFollowUps.map((followUp) => (
                <li key={followUp.leadId}>
                  <Link
                    href={`/leads/${followUp.leadId}`}
                    className="flex flex-wrap items-baseline justify-between gap-2 rounded-md border border-zinc-200 px-3 py-2 text-sm transition-colors hover:border-zinc-400 dark:border-zinc-800"
                  >
                    <span className="font-medium">{followUp.companyName}</span>
                    <span className="text-zinc-600 dark:text-zinc-400">
                      {STATUS_LABEL[followUp.status]} · previsto para{' '}
                      {new Date(followUp.nextActionAt).toLocaleString('pt-BR')}
                      {followUp.nextActionNote ? ` — ${followUp.nextActionNote}` : ''}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
