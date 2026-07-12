'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { LeadWithCompany } from './page';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

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

export function LeadDetail({ lead: initialLead }: { lead: LeadWithCompany }) {
  const [lead, setLead] = useState(initialLead);
  const [message, setMessage] = useState(initialLead.approachMessage ?? '');
  const [notes, setNotes] = useState(initialLead.notes ?? '');
  const [approvedBy, setApprovedBy] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSaveEdits() {
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const response = await fetch(`${API_URL}/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approachMessage: message, notes }),
      });
      if (!response.ok) {
        throw new Error(`Falha ao salvar (status ${response.status})`);
      }
      setLead((await response.json()) as LeadWithCompany);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Erro inesperado');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSend() {
    if (!approvedBy.trim()) {
      setErrorMessage('Informe quem está aprovando o envio.');
      return;
    }
    setIsSending(true);
    setErrorMessage(null);
    try {
      const response = await fetch(`${API_URL}/leads/${lead.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvedBy }),
      });
      if (!response.ok) {
        throw new Error(`Falha ao enviar (status ${response.status})`);
      }
      setLead((await response.json()) as LeadWithCompany);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Erro inesperado');
    } finally {
      setIsSending(false);
    }
  }

  const { company } = lead;
  const audit = company.websiteAudit;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{company.name}</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{company.category}</p>
        </div>
        <Badge variant={lead.status === 'not_sent' ? 'outline' : 'secondary'}>
          {STATUS_LABEL[lead.status] ?? lead.status}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Site antigo</CardTitle>
            <CardDescription>
              {audit
                ? audit.hasWebsite
                  ? `Nota: ${audit.aiGrade ?? 'não avaliado'}`
                  : 'Não tinha site'
                : 'Auditoria ainda não concluída'}
            </CardDescription>
          </CardHeader>
          {audit?.hasWebsite && audit.aiFindings ? (
            <CardContent>
              <ul className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
                {audit.aiFindings.map((finding, index) => (
                  <li key={index}>
                    <span className="font-medium">{finding.criterion}:</span> {finding.explanation}
                  </li>
                ))}
              </ul>
            </CardContent>
          ) : null}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preview novo</CardTitle>
            <CardDescription>
              {lead.previewUrl ? 'Publicado' : 'Ainda sendo gerado'}
            </CardDescription>
          </CardHeader>
          {lead.previewUrl ? (
            <CardContent>
              <a
                href={lead.previewUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium underline"
              >
                {lead.previewUrl}
              </a>
            </CardContent>
          ) : null}
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contato</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1 text-sm">
          <p>Telefone: {company.phone ?? 'não disponível'}</p>
          <p>WhatsApp: {company.whatsapp ?? 'não disponível'}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mensagem de abordagem</CardTitle>
          <CardDescription>Gerada por IA — edite antes de aprovar o envio.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={5} />
          <div className="grid gap-2">
            <Label htmlFor="notes">Notas internas</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
            />
          </div>
          <Button onClick={handleSaveEdits} disabled={isSaving} variant="outline">
            {isSaving ? 'Salvando...' : 'Salvar edições'}
          </Button>
        </CardContent>
      </Card>

      {lead.status === 'not_sent' ? (
        <Card>
          <CardHeader>
            <CardTitle>Aprovar envio</CardTitle>
            <CardDescription>
              Nenhuma mensagem é enviada automaticamente — confirme para liberar este lead.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="grid gap-2">
              <Label htmlFor="approvedBy">Aprovado por</Label>
              <Input
                id="approvedBy"
                value={approvedBy}
                onChange={(event) => setApprovedBy(event.target.value)}
                placeholder="Seu nome"
              />
            </div>
            <Button onClick={handleSend} disabled={isSending}>
              {isSending ? 'Enviando...' : 'Enviar'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <p className="text-sm text-zinc-500">
          Aprovado por {lead.approvedBy} em{' '}
          {lead.approvedAt ? new Date(lead.approvedAt).toLocaleString('pt-BR') : ''}.
        </p>
      )}

      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
    </div>
  );
}
