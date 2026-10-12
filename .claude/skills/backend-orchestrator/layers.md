# Backend — referência rápida por camada

Ler **só** se a rule da camada não bastar. Norma: `docs/16` + `.claude/rules/backend-*.md`.

## Models

- `modules/<dominio>/models/` — DDD puro, sem framework.

## Types / Enum

- `types/<entidade>/*.types.ts` · `types/ports/*.port.ts`
- `enum/<entidade>/*.enum.ts`
- Sem pasta `interfaces/`.

## Schema

- `schemas/<entidade>.schema.ts` (Zod)
- Consumidor: `patientSchema` (nunca `data`)

## Repository

- `<entidade>_<op>.repository.ts` → classe `CreateRepository`
- `TenantPrisma` + mapper

## Action

- Só com efeito além do repo
- Classe `CreateAction`

## Service

- Classe `CreateService` / `ListService`
- Com Action ou Repository direto

## Controller / Routes / Registration

- `<entidade>.controller.ts`
- `routes/v1/<entidade>.routes.ts`
- `backend/src/routes/index.ts` monta `/api/v1`

## Nomenclatura

```
patient_create.service.ts  → class CreateService
patient_list.repository.ts → class ListRepository
patient_create.action.ts   → class CreateAction
```

Ops: `list` | `get` | `create` | `update` | `delete`
