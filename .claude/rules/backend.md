---
paths:
  - "backend/**/*"
---

# Backend — regras gerais

**Arquitetura:** monólito modular + DDD (`models/`) + camadas Clean + SOLID. Código **simples, direto, organizado** — sem verbosidade nem complexidade especulativa. Ver `project-core.md`.

**Fluxo:** `Routes → Controller → Service → [Action?] → Repository`

- `Action` só com efeito além do repositório.
- Skill: `.claude/skills/backend-orchestrator/SKILL.md`
- Norma: `docs/16-estrutura-de-pastas.md`, `docs/05-arquitetura.md`, `docs/08-api-v1.md`

## Rules por camada

| Camada | Rule |
|--------|------|
| Models (domínio) | `rules/backend-models.md` |
| Types | `rules/backend-types.md` |
| Enum | `rules/backend-enum.md` |
| Schema (Zod) | `rules/backend-schema.md` |
| Repository | `rules/backend-repository.md` |
| Action | `rules/backend-action.md` |
| Service | `rules/backend-service.md` |
| Controller | `rules/backend-controller.md` |
| Routes | `rules/backend-routes.md` |
| API registration | `rules/backend-api-registration.md` |
| Modules (BC / `*_public`) | `rules/backend-modules.md` |
| Workers / Jobs | `rules/backend-workers.md` |
| Shared (provisório) | `rules/backend-shared.md` |

## Regras transversais bloqueantes

- Parâmetro `<entidade>Schema` tipado — **proibido** `data` genérico.
- Classe curta sem prefixo da entidade (`CreateService`).
- Arquivo `snake_case` (`patient_create.service.ts`).
- Ops: `list` / `get` / `create` / `update` / `delete` (+ `get_by_<uk>`, verbos de domínio).
- Repository: Prisma via `TenantPrisma`; um arquivo por operação.
- Service: sem Express/Prisma Client direto; fluxo no `execute`.
- Controller: fino — parse Zod → service → resposta.
- Tipagens em `types/`; enums em `enum/`; **sem** pasta `interfaces/`.
- Cruzar módulo só por `<dominio>_public.ts`.
- Uma operação = um arquivo = uma responsabilidade; sem god service/repository.
- Preferir o caminho mais curto que preserve as camadas — não inventar Action/port/helper “por padrão”.
