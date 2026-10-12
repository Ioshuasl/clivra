# Clivra — SaaS Odontológico Multi-Tenant

Monorepo único (`backend/`, `frontend/`, `docs/`, `contracts/`, `e2e/`). Fonte normativa do produto: `docs/` — sobretudo `docs/16-estrutura-de-pastas.md`, `docs/05-arquitetura.md`, `docs/09-frontend.md`, `docs/08-api-v1.md`.

## Precedência

1. Instrução explícita do usuário
2. `docs/` do produto
3. `.claude/rules/` (carregadas por caminho de arquivo; core sempre)
4. `.claude/skills/` (orquestradores; checklist só no gate final)
5. UI: `01-clivra-design-system.md` (raiz) + `.claude/docs/ui/INDEX.md` → **um** shard por vez

Rule e `docs/` divergem → perguntar ao usuário.

## Regras sempre ativas

- `.claude/rules/project-core.md` — arquitetura, convenções, política de referência de código
- `.claude/rules/product-decisions.md` — como explicar dúvidas de produto (linguagem leiga)

As demais rules carregam sozinhas ao tocar `backend/**` ou `frontend/**` (ver `paths:` no frontmatter).

## Arquitetura (bloqueante)

Monólito modular + DDD + Clean Architecture + SOLID + código simples/direto.

- **Backend:** `Routes → Controller → Service → [Action?] → Repository` (+ `models/` `types/` `enum/` `schemas/`). `Action` só com efeito além do repositório.
- **Frontend:** `Page → Component → Hook (TanStack Query) → Service → Data → API`. Só **Data** fala com a API.
- Tipagens em `types/`, enums em `enum/` — **nunca** `interfaces/`.
- Ops CRUD: `list` / `get` / `create` / `update` / `delete`.
- Backend: classe curta sem entidade (`CreateService`), arquivo `snake_case` (`patient_create.service.ts`), parâmetro `patientSchema` (nunca `data`).
- Frontend: arquivos `PascalCase` (`PatientCreateData.ts`); `*Form` = página, `*FormDialog` = modal.
- Prisma só em `repositories/` + `shared/database/` via `TenantPrisma`; módulo cruza módulo só por `<dominio>_public.ts`.
- Visual: **Clivra · Sora · Burgundy `#4A0F16` · 1366×768**. Proibido Notion-like / Orius.

## Dúvida = perguntar

Nunca decidir sozinho produto, DDL, contrato, Action vs CRUD puro, módulo novo, pasta em `shared/`, tipo de tela, copy. Pausar e perguntar, no formato de `product-decisions.md`.

## Skills (`.claude/skills/`)

| Skill | Quando |
|-------|--------|
| `backend-orchestrator` | CRUD / casos de uso em `backend/` |
| `frontend-orchestrator` | CRUD / telas em `frontend/` + 1 shard UI |
| `ui-refactor` | Refator visual preservando hooks/services/payloads |
| `ui-ux-systems` | Cheat sheet UI Clivra (sem codar) |
| `designer-ux` | Fluxo / tipo de tela |
| `designer-ui` | Pencil: 1 frame + `01-tokens-kit` |
| `pencil-tsx-recreate` | `.tsx` → `.pen` |
| `git` | Branch e commit (pattern-commits; nunca `Co-authored-by` sem pedido explícito) |
| `tester` | Suíte local (`pnpm tester`) |
| `sprint-orchestrator` | Sprint Must completa, subagentes sequenciais |
| `shadcn` | Primitivos em `frontend/src/shared/ui` |
| `ui-ux-pro-max` | Decisões visuais/UX amplas |
| `tiptap` · `migrate-radix-to-base` | Editor rich-text · migração Radix → Base |

Biblioteca de prompts por skill: `.claude/README.md`.

## Transversal

- Não expor tokens, senhas ou `.env`. Não inventar infraestrutura.
- Commit/push só quando o usuário pedir (exceção: fechamento verde do `sprint-orchestrator`). Mensagens: `.claude/docs/pattern-commits/pattern-commits.md`.
- Ao concluir: arquivos alterados, validações, bloqueios.
