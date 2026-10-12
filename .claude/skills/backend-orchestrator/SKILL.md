---
name: backend-orchestrator
description: >-
  Orquestra CRUD/casos de uso no backend Node/Express/Prisma por camadas
  (models, types, enum, schema, repository, action?, service, controller, routes).
  Use ao criar ou ajustar endpoints em backend/. Fonte: docs/16 + rules .claude.
---

# Backend Orchestrator

## Objetivo

Implementar/corrigir `backend/` no fluxo:

`Routes → Controller → Service → [Action?] → Repository`

(+ `models/` / `types/` / `enum/` / `schemas/` conforme necessário)

## Política de tokens

**Ordem:** `docs/16` (se estrutura ambígua) → rule(s) `backend-*.md` das camadas afetadas → implementar → [checklist.md](checklist.md) **só no gate final**.  
[layers.md](layers.md) só se a camada não estiver clara.

| Tarefa | Ler | Não ler |
|--------|-----|---------|
| CRUD camada(s) N | `.claude/rules/backend-<camada>.md` + checklist no fim | monólito UI, código legado Orius/Python |
| Multi-tenant / RLS | `docs/06` sob demanda | — |

## Gate de pergunta (obrigatório)

**Nunca tomar decisão de forma autônoma.** Em dúvida, ambiguidade ou **qualquer escolha** (produto, DDL, contrato, Action vs CRUD puro, nome de BC, port sync vs outbox, shape de API, etc.) → **perguntar ao usuário e pausar** até a resposta.

Só segue sem perguntar o que já está **explícito** na instrução do usuário ou **fechado** em `docs/` / rules (ex.: nomenclatura `list/get/create`, parâmetro `patientSchema`, envelope `{ data }`).

| Perguntar (sempre) | Seguir sem perguntar |
|--------------------|----------------------|
| Dúvida ou 2+ caminhos válidos | Convenção já normativa em `docs/16` / rules |
| Schema/DDL / regra de negócio | Ops CRUD e classes curtas já definidas |
| Criar Action, módulo, job, pasta em `shared/` | — |

## Execução

1. Classificar módulo (`patients`, `scheduling`, …), entidade, operação (`list|get|create|update|delete` ou verbo de domínio).
2. Se DDL/contrato ambíguo → perguntar.
3. Identificar camadas; **Action só se houver efeito além do repositório**.
4. Ler rules dessas camadas.
5. Implementar: types/enum/schema → models (se invariante) → repository → [action] → service → controller → routes → registration.
6. Gate final: [checklist.md](checklist.md).

## Rules

| Camada | Rule |
|--------|------|
| Models | `backend-models.md` |
| Types | `backend-types.md` |
| Enum | `backend-enum.md` |
| Schema | `backend-schema.md` |
| Repository | `backend-repository.md` |
| Action | `backend-action.md` |
| Service | `backend-service.md` |
| Controller | `backend-controller.md` |
| Routes | `backend-routes.md` |
| Registration | `backend-api-registration.md` |
| Modules | `backend-modules.md` |
| Workers / Jobs | `backend-workers.md` |
| Shared | `backend-shared.md` |

## Regras críticas

- **Nunca decidir sozinho** — dúvida ou escolha → perguntar e pausar.
- Monólito modular + DDD + Clean + SOLID; código simples/direto — sem over-engineering.
- Classes curtas: `CreateService`, `ListRepository`, `CreateAction` — **sem** prefixo da entidade.
- Arquivo `snake_case`: `patient_create.service.ts`.
- Parâmetro: `patientSchema` — **nunca** `data`.
- Update: `execute(ctx, patientId, patientSchema)`.
- Ops: `list` / `get` / `create` / `update` / `delete`.
- Prisma só em `repositories/` + `shared/database/` via `TenantPrisma`.
- Sem pasta `interfaces/` — tipagens em `types/`.

## Saída

```
Implementado: [resumo]
Arquivos: [lista]
Validação: [comandos ou pendências]
Bloqueios: [se houver]
```
