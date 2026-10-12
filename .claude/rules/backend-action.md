---
paths:
  - "backend/src/modules/**/actions/**/*"
---

# Backend — Action

## Caminho

`backend/src/modules/<dominio>/actions/<entidade>/<entidade>_<op>.action.ts`

## Quando criar

**Somente** se, além de persistir no repositório da entidade, também:

- publica evento / grava outbox;
- chama port de outro módulo;
- orquestra mais de um repositório na mesma UoW;
- dispara efeito que não é “só o Prisma desta entidade”.

CRUD puro (list/get/update simples) → **não** criar Action; Service chama Repository.

## Obrigatório

- Classe curta: `CreateAction`, `ConfirmAction`, …
- `execute(ctx, patientSchema)` (ou entidade) — **nunca** `data`.
- Sem HTTP/Express; sem Zod parse (já veio do controller).

## Proibido

- Action sem efeito colateral real.
- Prefixo da entidade na classe.
- SQL fora do repository.

Norma: `docs/16` §1.5.
