---
paths:
  - "backend/src/modules/**/schemas/**/*"
---

# Backend — Schema (Zod)

## Caminho

`backend/src/modules/<dominio>/schemas/<entidade>.schema.ts`

## Obrigatório

- Schemas Zod para body/query/params das rotas.
- Exportar schema + tipo inferido (`z.infer`) usado como `<entidade>CreateSchema`, etc.
- Update **sem** PK no body (PK vem do path).
- Consumidores tipam parâmetro como `patientSchema` — **nunca** `data`.

## Proibido

- Regra de domínio complexa (fica em `models/`).
- Prisma / SQL.
- Pasta `interfaces/` para tipagem de request.

Norma: `docs/08-api-v1.md`, `docs/16`.
