# 1. Registrar decisões de arquitetura em ADRs

Data: 2026-07-11

## Status

Aceito

## Contexto

O projeto é construído de forma autônoma e incremental, por múltiplas sessões de trabalho, seguindo a skill `autonomous-saas-engineer`. Decisões estruturais (stack, protocolos de integração, modelagem de dados, políticas de segurança) precisam ficar registradas com o motivo por trás delas — não apenas o resultado — para que trabalho futuro não reverta decisões deliberadas por falta de contexto.

## Decisão

Toda decisão de arquitetura relevante é registrada como um ADR (Architecture Decision Record) em `docs/adr/`, numerado sequencialmente, no formato Michael Nygard (Título, Data, Status, Contexto, Decisão, Consequências).

## Consequências

- Decisões passam a ser rastreáveis e revisáveis.
- Antes de propor uma mudança estrutural, a Fase de "Rebuild Context" (Agent 2 da skill) deve ler os ADRs existentes.
- ADRs não são editados retroativamente para mudar uma decisão — uma mudança de decisão gera um novo ADR que supersede o anterior.
