---
paths:
  - "backend/src/shared/**/*"
---

# Backend — Shared

## Status

Layout e subpastas de `shared/` podem **mudar** conforme o código evoluir. Esta rule fixa **intenções bloqueantes**, não um inventário rígido. Em conflito com `docs/16`, perguntar.

## Caminho (snapshot atual — `docs/16`)

```
backend/src/shared/
├── config/          # env tipado
├── database/        # Prisma, TenantPrisma/RLS, UoW, outbox
├── middlewares/
├── integrations/    # adapters de APIs externas
├── crypto/          # KeyManagementPort + envelope
├── storage/         # ObjectStorage port (MinIO/S3 + fake)
├── queue/           # BullMQ client / registro de filas
├── domain/          # kernel: EntityId, TenantId, DomainEvent, erros base
└── helpers/
```

## O que pode entrar

- Código com **2+ consumidores reais** (módulos ou api+worker).
- Infra transversal: tenant/RLS, UoW, outbox append/dispatch helper, config, middlewares HTTP, clients de fila.
- Kernel de domínio **genérico** (IDs, `DomainEvent` base) — sem invariantes de Patient/Appointment/etc.
- Adapters externos em `integrations/` implementando ports definidos nos módulos.

## O que não pode

- Regra de negócio de um bounded context (isso é `modules/<dominio>/models|services|…`).
- “Utils” especulativos sem segundo consumidor.
- Prisma Client fora de `shared/database/` + `modules/**/repositories/`.
- Publicar evento direto na fila sem passar pelo outbox do caso de uso (ver `backend-workers.md`).

## Prisma / multi-tenant

- Acesso a dados de negócio: sempre via `TenantPrisma` / contexto de tenant.
- Migrações e `schema.prisma` seguem o processo do repo; não inventar segunda fonte de verdade ORM.

## Integrações

- Módulo define port em `types/ports/`.
- Adapter concreto em `shared/integrations/<provedor>/` (ou pasta acordada).
- Não vazar SDK do provedor para `models/` / `services/` do domínio.

## Em dúvida / mudança de pasta

Antes de renomear, fundir ou criar subpasta em `shared/`: **perguntar** e atualizar `docs/16` + esta rule no mesmo PR/changeset.
