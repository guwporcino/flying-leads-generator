# 7. Integração com Google Places: Text Search (New), sem WhatsApp, sem paginação

Data: 2026-07-11

## Status

Aceito

## Contexto

ARCHITECTURE.md §2.1 especifica os filtros e o contrato `Company`, mas não a API/endpoint exatos do Google a usar. Havia mais de uma forma razoável de implementar a busca.

## Decisão

- **Endpoint:** Places API (New) — `POST https://places.googleapis.com/v1/places:searchText`, não a Nearby Search nem a Places API legada (deprecada para projetos novos). O texto da busca é `"{nicho} em {bairro, cidade}"`, com viés de localização (`locationBias.circle`) centrado no ponto geocodificado.
- **Sem chamada extra de Place Details:** o field mask do Text Search já inclui todos os campos que o contrato `Company` precisa (telefone, site, horário, avaliações, localização, etc.), evitando uma segunda chamada por lugar — reduz custo e latência.
- **`whatsapp` fica `null` na Fase 1:** o Google não expõe WhatsApp em nenhum endpoint. O campo é preenchido futuramente (Fase 2, scraping do site, ou heurística sobre o telefone). O filtro `requireWhatsapp` da campanha, quando marcado, hoje sempre zera os resultados — é um limite conhecido, não um bug.
- **Sem paginação:** cada campanha busca até 20 lugares (máximo de uma página do Text Search). Campanhas que precisem de mais resultados terão paginação implementada quando houver demanda real (YAGNI).
- **Deduplicação por `googlePlaceId`:** como esse campo é `@unique` no schema, uma empresa já descoberta por uma campanha anterior não é duplicada nem reatribuída — `createMany({ skipDuplicates: true })` a mantém associada à campanha original.

## Consequências

- Menor custo de API (uma chamada de busca por campanha, sem Place Details).
- Qualquer filtro de campanha baseado em WhatsApp é inútil até a Fase 2 existir — vale reavaliar se esconder esse filtro da UI ou deixá-lo, documentado como limitação (a UI atual já não o expõe).
- Campanhas com raio populoso (>20 estabelecimentos) terão apenas uma amostra parcial até que paginação seja implementada.
