# Arquitetura — Flying Leads Generator

Este documento é a fonte da verdade sobre módulos, contratos de dados e decisões estruturais do sistema. Deve ser mantido sincronizado a cada mudança relevante (ver Documentation Policy na skill `autonomous-saas-engineer`).

## 1. Visão geral do pipeline

```
Dashboard
   │
   ▼
Configuração da campanha
   │
   ▼
Google Maps Search Engine
   │
   ▼
Coletor das Empresas
   │
   ▼
Analisador de Website
   │
   ├── Não possui site? ──────────┐
   │                              │
   └── Possui site desatualizado? │
                 │                │
                 ▼                ▼
            Score de Oportunidade
                 │
                 ▼
     Gerador de novo website (Claude + UI Skill)
                 │
                 ▼
          Deploy automático (Vercel)
                 │
                 ▼
          Link de Preview disponível
                 │
                 ▼
          Fila de Aprovação Manual
                 │
                 ▼
     Envio via WhatsApp Business API (oficial)
                 │
                 ▼
              CRM + Follow-up
```

Princípio de arquitetura: **cada caixa acima é um módulo/serviço independente**, comunicando-se por contratos de dados explícitos e por fila (BullMQ), nunca por acoplamento direto de implementação. Isso permite substituir, testar e escalar cada etapa isoladamente (ex.: trocar o provedor de scraping sem tocar no gerador de site).

---

## 2. Módulos

### 2.1 Google Maps Search (campanha de busca)

**Filtros de entrada:**

- Nicho (dentista, advogado, mecânico, pizzaria, loja de roupas, auto elétrica, ... — lista configurável, não hardcoded)
- Localização: cidade, bairro, CEP, endereço, raio (1/3/5/10/20 km)
- Filtros extras: empresas abertas, nº de avaliações (acima de X), nota (abaixo de X estrelas), sem website, com website, telefone disponível, WhatsApp disponível

**Contrato de saída por empresa (`Company`):**

```
nome, telefone, whatsapp, website, categoria, horario,
numero_avaliacoes, nota, fotos[], descricao,
latitude, longitude, google_maps_url, google_place_id
```

Fonte: Google Places API + Geocoding API.

### 2.2 Coletor de informações (scraper)

**Se a empresa possui website:** scraping estruturado extraindo:

- título, descrição, tecnologia detectada (stack fingerprint), quantidade de páginas
- performance (Core Web Vitals / Lighthouse), SEO on-page, links quebrados, HTTPS, responsividade, tempo de carregamento
- última atualização detectável, copyright/ano, redes sociais vinculadas, presença de mapa, formulário de contato, blog

**Se não possui website:** a empresa é marcada imediatamente como oportunidade (100 pontos, ver §2.4), sem passar pela análise de conteúdo.

### 2.3 IA avaliadora (Website Grader)

Claude recebe todos os dados coletados (2.1 + 2.2) e avalia com critérios fixos: UI, UX, responsividade, performance, SEO, design, credibilidade, modernidade, clareza, CTA, conversão.

Saída obrigatória e estruturada (JSON, não texto livre):

```
{
  "criterios": { "ui": 0-10, "ux": 0-10, ..., "conversao": 0-10 },
  "classificacao": "Excelente" | "Bom" | "Regular" | "Ruim" | "Péssimo",
  "problemas": [ { "criterio": "...", "explicacao": "..." } ],
  "opportunity_score": 0-100
}
```

O prompt e o schema de saída vivem versionados em `docs/prompts/website-grader.md` (a criar na Fase 3) para permitir auditoria e regressão.

### 2.4 Classificação automática (Opportunity Score)

Score determinístico que ordena a fila de trabalho. Exemplos de referência:

| Situação                                 | Score |
| ---------------------------------------- | ----- |
| Sem site                                 | 100   |
| Site muito antigo (ex.: WordPress ~2012) | 88–92 |
| Site lento                               | 74    |
| Site excelente                           | 15    |

O score final combina um componente determinístico (regras acima) com o `opportunity_score` da IA avaliadora — a fórmula de combinação é uma decisão de produto a registrar em ADR quando implementada (Fase 3).

### 2.5 Gerador de Website

Entrada: dados do Google Meu Negócio, fotos, descrição, categoria, avaliações, telefone, WhatsApp, Instagram, logo (se existir), site antigo (se existir).

Processo: Claude Code invoca uma skill de geração de UI (`ui-ux-pro-max` ou equivalente) para produzir uma landing page ou website completo em Next.js + Tailwind + shadcn/ui, com Motion, SEO, OpenGraph, Schema.org, responsivo, dark mode, meta de performance 95+ (Lighthouse).

Saída: projeto completo pronto para deploy (repositório/branch dedicado por lead).

### 2.6 Deploy automático

```
GitHub → Vercel → preview.vercel.app
```

O link de preview gerado é persistido e associado ao `Company`/`Lead` correspondente — é o artefato mostrado na fila de aprovação.

### 2.7 Fila de Aprovação Manual

Regra inegociável: **nada é enviado ao lead automaticamente.**

Interface lista os leads processados; ao selecionar um item, o operador vê: análise do site antigo, preview do novo site, mensagem de abordagem pronta (gerada por IA, editável), telefone/WhatsApp, notas internas. Só então o operador aciona "Enviar".

### 2.8 WhatsApp

Decisão de arquitetura (ver ADR 0003): **sem automação que simule comportamento humano e sem uso de APIs não oficiais** para envio em massa — risco de bloqueio e violação dos termos da plataforma.

Fluxo adotado:

1. sistema gera a mensagem personalizada;
2. envio é feito via **WhatsApp Business API oficial** (ou abertura de conversa para envio manual quando a API oficial não se aplicar ao caso);
3. confirmação humana obrigatória antes de cada envio (consequência direta da Fila de Aprovação, §2.7);
4. histórico de contatos é registrado para evitar mensagens duplicadas.

### 2.9 CRM

Status possíveis por lead, em ordem de funil:

```
Não enviado → Enviado → Visualizou → Respondeu → Interessado → Reunião → Cliente
                                                                        ↘ Perdido
```

### 2.10 Dashboard

Métricas agregadas por período (ex.: "hoje"): empresas encontradas, oportunidades identificadas, previews criados, mensagens enviadas, respostas, reuniões, vendas.

---

## 3. Loop de agentes (geração por empresa)

Em vez de um único prompt monolítico, o processamento de cada empresa passa por um pipeline de agentes especializados, cada um com entrada/saída bem definida e responsabilidade única — mapeando 1:1 para os módulos da §2:

```
Empresa
  │
  ▼
Agent 1 — Busca Google Maps                 (módulo 2.1)
  │
  ▼
Agent 2 — Extrai informações públicas        (módulo 2.2)
  │
  ▼
Agent 3 — Analisa o website                  (módulo 2.3)
  │
  ▼
Agent 4 — Calcula Opportunity Score          (módulo 2.4)
  │
  ▼
Agent 5 — Gera novo website                  (módulo 2.5)
  │
  ▼
Agent 6 — Revisa UI/UX, acessibilidade, SEO  (Agent 4 da skill: Continuous Reviewer)
  │
  ▼
Agent 7 — Publica preview no Vercel          (módulo 2.6)
  │
  ▼
Agent 8 — Escreve abordagem personalizada
  │
  ▼
Fila de Aprovação                            (módulo 2.7)
```

Implementação: cada agente é um _job_ de fila (BullMQ) encadeado, não uma chamada síncrona — permite retry, observabilidade e paralelismo entre empresas de uma mesma campanha.

---

## 4. Stack técnica

| Camada   | Tecnologia                                                   |
| -------- | ------------------------------------------------------------ |
| Frontend | Next.js, React, Tailwind CSS, shadcn/ui                      |
| Backend  | NestJS, PostgreSQL, Redis, BullMQ                            |
| IA       | Claude Code / Claude API, MCP Servers, OpenAI (opcional)     |
| Infra    | GitHub, Vercel, Docker, Supabase (Auth)                      |
| Mapas    | Google Places API, Google Maps JavaScript API, Geocoding API |

## 5. Layout de monorepo (proposto — a criar na Fase 0 do ROADMAP)

```
apps/
  web/          # Next.js — dashboard, fila de aprovação, CRM
  api/          # NestJS — API, orquestração dos agentes, filas
packages/
  shared-types/ # contratos (Company, Lead, WebsiteAudit, OpportunityScore, ...)
  ui/           # componentes shadcn/ui compartilhados
docs/
  adr/
  prompts/      # prompts versionados dos agentes de IA
```

Decisão formal de stack e monorepo: ver [ADR 0002](./docs/adr/0002-monorepo-and-tech-stack.md).
