
# SaaS Odontológico Multi-Tenant — regras globais

## Arquitetura e estilo (bloqueante — backend e frontend)

Respeitar **sempre**, com rigor:

| Pilar | Obrigação |
|-------|-----------|
| Monólito modular | Um deploy; BCs/packages isolados; cruzar só por API pública (`*_public.ts` / `shared/`) |
| DDD | Invariantes e linguagem ubíqua em `models/` (backend); UI não redefine regra de domínio |
| Clean Architecture | Dependências para dentro; HTTP/Prisma/SDK só nas bordas; use cases orquestram |
| SOLID | 1 responsabilidade por arquivo/classe; abrir por extensão via ports; não acoplar a detalhe de infra |
| Simplicidade | Direto, organizado, sem verbosidade nem abstração especulativa |

**Proibido:** over-engineering, indirection sem necessidade, god classes, duplicar regra em várias camadas, “frameworks internos” ad hoc, comentários/código morto que só enchem.

Em dúvida entre “elegante/genérico” e “simples/explícito” → escolher **simples**. Se a complexidade parecer necessária → **perguntar**.

## Fluxos obrigatórios

**Backend (`backend/`):** `Routes → Controller → Service → [Action?] → Repository`

- `Action` **somente** quando há efeito além do repositório (outbox, outro módulo, port).
- CRUD puro: `Service → Repository`.

**Frontend (`frontend/`):** `Page → Component → Hook → Service → Data → API`

- Hook usa **TanStack Query** (`useQuery` / `useMutation`).
- CollectionHook legado **não** é obrigatório (usar TanStack Query).

## Fontes normativas (prioridade)

1. Instrução explícita do usuário
2. `docs/` do produto — sobretudo `docs/16-estrutura-de-pastas.md`, `docs/05-arquitetura.md`, `docs/09-frontend.md`
3. Rules em `.claude/rules/` (por camada)
4. Skills em `.claude/skills/` (orchestrators; checklist só no gate final)
5. UI detalhada: `01-clivra-design-system.md` (norma visual) + `.claude/docs/ui/INDEX.md` → **um** shard (nunca monólito; sem Notion/Orius visual)

Em dúvida de pasta/nomenclatura, seguir `docs/16`.

## Política de referência de código

- Desenvolver a partir das **rules** + `docs/` — **não** usar código legado Orius/Python/Firebird como modelo de arquitetura.
- Visual/UI: seguir **Clivra** (`01-clivra-design-system.md`); **não** Notion-like nem Orius provisional.
- Consultar código existente **somente** quando o usuário pedir, citar entidade de referência, ou para editar o arquivo-alvo.
- Se rule e `docs/` divergirem, perguntar ao usuário.
- **Perguntar** em qualquer decisão de produto/DDL/contrato ambíguo.

## Convenções bloqueantes

| Tema | Regra |
|------|--------|
| Paths | `backend/`, `frontend/` (não `api/`, `app/`) |
| Ops CRUD | `list` / `get` / `create` / `update` / `delete` |
| Classe (backend) | Curta, sem entidade: `CreateService`, `ListRepository` |
| Arquivo backend | `snake_case`: `patient_create.service.ts` |
| Arquivo frontend | `PascalCase`: `PatientCreateData.ts` |
| Parâmetro schema | `<entidade>Schema` — **proibido** `data` genérico |
| Tipagens | pasta `types/` — **sem** `interfaces/` |
| Enums | pasta `enum/` |
| Domínio rico | `models/` (DDD); sem Express/Prisma/Zod |
| ORM | Prisma só em `repositories/` e `shared/database/` |
| Multi-tenant | Sempre via `TenantPrisma` / RLS |
| Cruzar módulo | só `<dominio>_public.ts` |

## Frontend — padrões bloqueantes (resumo)

- Única camada que fala com API: **Data**
- Hook → Service → Data; Query/Mutation no Hook
- FormHook; modal = `*FormDialog`; página = `*Form`
- Modais montados só quando abertos
- **Nunca** `frontend/src/packages/*/actions` — helpers em `shared/` ou no Hook/Service
- Packages: `operacional` / `clinico` / `financeiro` / `admin` / `messaging` / `public`

## Regras transversais

- Não expor tokens, senhas ou credenciais de `.env`.
- Não inventar infraestrutura inexistente.
- Ao concluir: informar arquivos alterados, validações e bloqueios.
- Em dúvida/tomada de decisão: **perguntar ao usuário** — explicar no nível leigo detalhado (`product-decisions.md`).

## Rules por camada

Backend: `backend-models`, `backend-types`, `backend-enum`, `backend-schema`, `backend-repository`, `backend-action`, `backend-service`, `backend-controller`, `backend-routes`, `backend-api-registration`, `backend-modules`, `backend-workers`, `backend-shared`.

Frontend: `frontend-types`, `frontend-enum`, `frontend-schema`, `frontend-data`, `frontend-service`, `frontend-hook`, `frontend-component-*`, `frontend-page`, `frontend-shared`.

## Skills

| Área | Skill |
|------|-------|
| Backend | `.claude/skills/backend-orchestrator/` |
| Frontend | `.claude/skills/frontend-orchestrator/` |
| UI/UX sistemas | `.claude/skills/ui-ux-systems/` |
| Refatoração UI | `.claude/skills/ui-refactor/` |
| Design Pencil UI/UX | `.claude/skills/designer-ui/` · `designer-ux/` (Clivra) |
| TSX → Pencil | `.claude/skills/pencil-tsx-recreate/` |
| Git | `.claude/skills/git/` |
| Tester (suíte local) | `.claude/skills/tester/` |
| Sprint (orquestrador) | `.claude/skills/sprint-orchestrator/` |
