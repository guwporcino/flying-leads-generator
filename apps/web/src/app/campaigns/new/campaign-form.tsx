'use client';

import { useState, type FormEvent } from 'react';
import type { Company } from '@flying-leads/shared-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const RADIUS_OPTIONS = ['1', '3', '5', '10', '20'] as const;
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

interface CampaignResult {
  id: string;
  companies: Company[];
}

export function CampaignForm() {
  const [niche, setNiche] = useState('');
  const [city, setCity] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [address, setAddress] = useState('');
  const [radiusKm, setRadiusKm] = useState<string>('5');
  const [onlyOpenNow, setOnlyOpenNow] = useState(false);
  const [withoutWebsite, setWithoutWebsite] = useState(false);
  const [requirePhone, setRequirePhone] = useState(false);
  const [minReviewCount, setMinReviewCount] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<CampaignResult | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setResult(null);

    const filters: Record<string, unknown> = {};
    if (onlyOpenNow) filters.onlyOpenNow = true;
    if (withoutWebsite) filters.withoutWebsite = true;
    if (requirePhone) filters.requirePhone = true;
    if (minReviewCount) filters.minReviewCount = Number(minReviewCount);

    try {
      const response = await fetch(`${API_URL}/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          niche,
          city,
          neighborhood: neighborhood || undefined,
          postalCode: postalCode || undefined,
          address: address || undefined,
          radiusKm: Number(radiusKm),
          filters: Object.keys(filters).length > 0 ? filters : undefined,
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(body?.message ?? `Falha ao criar campanha (status ${response.status})`);
      }

      setResult((await response.json()) as CampaignResult);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Erro inesperado');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-8">
      <Card>
        <CardHeader>
          <CardTitle>Nova campanha</CardTitle>
          <CardDescription>Busca empresas no Google Maps por nicho e localização.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="niche">Nicho</Label>
              <Input
                id="niche"
                placeholder="dentista, advogado, pizzaria..."
                value={niche}
                onChange={(event) => setNiche(event.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="city">Cidade</Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="neighborhood">Bairro</Label>
                <Input
                  id="neighborhood"
                  value={neighborhood}
                  onChange={(event) => setNeighborhood(event.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="postalCode">CEP</Label>
                <Input
                  id="postalCode"
                  value={postalCode}
                  onChange={(event) => setPostalCode(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="address">Endereço</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="radiusKm">Raio de busca</Label>
              <Select value={radiusKm} onValueChange={(value) => value && setRadiusKm(value)}>
                <SelectTrigger id="radiusKm" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RADIUS_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option} km
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="minReviewCount">Mínimo de avaliações</Label>
              <Input
                id="minReviewCount"
                type="number"
                min={0}
                value={minReviewCount}
                onChange={(event) => setMinReviewCount(event.target.value)}
              />
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="onlyOpenNow"
                  checked={onlyOpenNow}
                  onCheckedChange={(checked) => setOnlyOpenNow(checked === true)}
                />
                <Label htmlFor="onlyOpenNow">Somente empresas abertas agora</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="withoutWebsite"
                  checked={withoutWebsite}
                  onCheckedChange={(checked) => setWithoutWebsite(checked === true)}
                />
                <Label htmlFor="withoutWebsite">Somente sem website (maior oportunidade)</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="requirePhone"
                  checked={requirePhone}
                  onCheckedChange={(checked) => setRequirePhone(checked === true)}
                />
                <Label htmlFor="requirePhone">Somente com telefone disponível</Label>
              </div>
            </div>

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Buscando...' : 'Buscar empresas'}
            </Button>

            {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
          </form>
        </CardContent>
      </Card>

      {result ? (
        <Card>
          <CardHeader>
            <CardTitle>{result.companies.length} empresa(s) encontrada(s)</CardTitle>
            <CardDescription>Campanha {result.id}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-3">
              {result.companies.map((company) => (
                <li key={company.id} className="rounded-md border p-3 text-sm">
                  <p className="font-medium">{company.name}</p>
                  <p className="text-muted-foreground">
                    {company.category} · {company.reviewCount} avaliações
                    {company.rating ? ` · ${company.rating}★` : ''}
                  </p>
                  <p className="text-muted-foreground">
                    {company.website ? company.website : 'Sem website — oportunidade'}
                  </p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
