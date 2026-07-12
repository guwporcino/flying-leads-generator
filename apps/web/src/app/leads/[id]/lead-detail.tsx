'use client';

import { useState } from 'react';
import type { ContactAttempt, LeadStatus } from '@flying-leads/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

/** Estágios que o operador pode setar manualmente — ver ADR 0013. */
const MANUAL_STATUSES: LeadStatus[] = [
  'viewed',
  'replied',
  'interested',
  'meeting',
  'customer',
  'lost',
];

/** ISO → valor de <input type="datetime-local"> no fuso local. */
function toDatetimeLocal(iso: string | null): string {
  if (!iso) {
    return '';
  }
  const date = new Date(iso);
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

export function LeadDetail({ lead: initialLead }: { lead: LeadWithCompany }) {
  const [lead, setLead] = useState(initialLead);
  const [message, setMessage] = useState(initialLead.approachMessage ?? '');
  const [notes, setNotes] = useState(initialLead.notes ?? '');
  const [nextActionAt, setNextActionAt] = useState(toDatetimeLocal(initialLead.nextActionAt));
  const [nextActionNote, setNextActionNote] = useState(initialLead.nextActionNote ?? '');
  const [approvedBy, setApprovedBy] = useState('');
  const [newStatus, setNewStatus] = useState<string>('');
  const [changedBy, setChangedBy] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSaveEdits() {
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const response = await fetch(`${API_URL}/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approachMessage: message,
          notes,
          nextActionAt: nextActionAt ? new Date(nextActionAt).toISOString() : null,
          nextActionNote: nextActionNote || null,
        }),
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

  async function handleUpdateStatus() {
    if (!newStatus) {
      setErrorMessage('Escolha o novo status.');
      return;
    }
    if (!changedBy.trim()) {
      setErrorMessage('Informe quem está registrando a mudança de status.');
      return;
    }
    setIsUpdatingStatus(true);
    setErrorMessage(null);
    try {
      const response = await fetch(`${API_URL}/leads/${lead.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, changedBy }),
      });
      if (!response.ok) {
        throw new Error(`Falha ao atualizar status (status ${response.status})`);
      }
      setLead((await response.json()) as LeadWithCompany);
      setNewStatus('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Erro inesperado');
    } finally {
      setIsUpdatingStatus(false);
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
  const lastContactAttempt = lead.contactAttempts?.[0];

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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="nextActionAt">Próxima ação (follow-up)</Label>
              <Input
                id="nextActionAt"
                type="datetime-local"
                value={nextActionAt}
                onChange={(event) => setNextActionAt(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nextActionNote">Nota do follow-up</Label>
              <Input
                id="nextActionNote"
                value={nextActionNote}
                onChange={(event) => setNextActionNote(event.target.value)}
                placeholder="Ex.: ligar de volta"
              />
            </div>
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
        <>
          <div className="flex flex-col gap-2 text-sm text-zinc-500">
            <p>
              Aprovado por {lead.approvedBy} em{' '}
              {lead.approvedAt ? new Date(lead.approvedAt).toLocaleString('pt-BR') : ''}.
            </p>
            {lastContactAttempt ? (
              <ContactAttemptStatusMessage attempt={lastContactAttempt} />
            ) : null}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Status do funil</CardTitle>
              <CardDescription>
                Registre manualmente a evolução do lead no funil de CRM.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="newStatus">Novo status</Label>
                  <Select
                    value={newStatus}
                    onValueChange={(value) => setNewStatus(value ?? '')}
                  >
                    <SelectTrigger id="newStatus" className="w-full">
                      <SelectValue placeholder="Escolha o status" />
                    </SelectTrigger>
                    <SelectContent>
                      {MANUAL_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {STATUS_LABEL[status]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="changedBy">Registrado por</Label>
                  <Input
                    id="changedBy"
                    value={changedBy}
                    onChange={(event) => setChangedBy(event.target.value)}
                    placeholder="Seu nome"
                  />
                </div>
              </div>
              <Button onClick={handleUpdateStatus} disabled={isUpdatingStatus} variant="outline">
                {isUpdatingStatus ? 'Atualizando...' : 'Atualizar status'}
              </Button>
            </CardContent>
          </Card>
        </>
      )}

      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
    </div>
  );
}

function ContactAttemptStatusMessage({ attempt }: { attempt: ContactAttempt }) {
  if (attempt.channel === 'whatsapp_api' && attempt.status === 'sent') {
    return <p>Mensagem enviada via WhatsApp Business API oficial.</p>;
  }
  if (
    attempt.channel === 'manual_link' &&
    attempt.status === 'sent' &&
    attempt.providerMessageId
  ) {
    return (
      <p>
        API oficial não disponível para este lead —{' '}
        <a
          href={attempt.providerMessageId}
          target="_blank"
          rel="noreferrer"
          className="font-medium underline"
        >
          abra o WhatsApp
        </a>{' '}
        para enviar manualmente.
      </p>
    );
  }
  return <p className="text-destructive">Falha ao preparar o envio: {attempt.errorMessage}</p>;
}
