---
paths:
  - "backend/src/modules/**/controllers/**/*"
---

# Backend — Controller

## Caminho

`backend/src/modules/<dominio>/controllers/<entidade>.controller.ts`

## Obrigatório

- Classe `<Entidade>Controller` (aqui o prefixo da entidade **é** permitido — é a fachada HTTP).
- Parse com Zod schema; chama service; responde envelope `{ data }` / erro via handler central.
- Usa `req.ctx` (tenant) — nunca `tenantId` do body.
- Métodos alinhados às ops: `list`, `get`, `create`, `update`, `delete`.

## Proibido

- Regra de negócio / SQL / Prisma.
- `try/catch` espalhado para DomainError (usar error handler).
- Parâmetro `data` genérico.

Norma: `docs/08-api-v1.md`, `docs/05`.
