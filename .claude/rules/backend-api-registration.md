---
paths:
  - "backend/src/routes/**/*"
---

# Backend — API registration

## Caminho

`backend/src/routes/index.ts` (+ composição em `*.module.ts`)

## Obrigatório

- Agregar rotas de cada módulo sob `/api/v1`.
- Cada módulo exporta rotas via `*.module.ts` / `buildXRoutes`.
- Health/ready conforme `docs/08`.

## Proibido

- Lógica de negócio no aggregator.
- Rotas fora de router versionado.

Norma: `docs/05`, `docs/08`, ADR-0003.
