---
paths:
  - "frontend/**/*"
---

# Frontend — regras gerais

**Arquitetura:** monólito modular (packages) + camadas Clean no fluxo de dados + SOLID. Código **simples, direto, organizado** — sem verbosidade nem complexidade especulativa. Ver `project-core.md`. Domínio rico fica no backend; UI não duplica invariantes.

**Fluxo:** `Page → Component → Hook → Service → Data → API`

- Hook com **TanStack Query** (`useQuery` / `useMutation`).
- Skill: `.claude/skills/frontend-orchestrator/SKILL.md`
- Norma: `docs/16-estrutura-de-pastas.md`, `docs/09-frontend.md`

## Rules por camada

| Camada | Rule |
|--------|------|
| Types | `rules/frontend-types.md` |
| Enum | `rules/frontend-enum.md` |
| Schema | `rules/frontend-schema.md` |
| Data | `rules/frontend-data.md` |
| Service | `rules/frontend-service.md` |
| Hook | `rules/frontend-hook.md` |
| Component Index | `rules/frontend-component-index.md` |
| Component Form (página) | `rules/frontend-component-form.md` |
| Component FormDialog (modal) | `rules/frontend-component-form-dialog.md` |
| Component Table | `rules/frontend-component-table.md` |
| Component Columns | `rules/frontend-component-columns.md` |
| Component Select | `rules/frontend-component-select.md` |
| Page | `rules/frontend-page.md` |
| Shared | `rules/frontend-shared.md` |

**Nomenclatura de formulário:** `*Form` = página; `*FormDialog` = modal/Dialog.

Packages: `operacional` · `clinico` · `financeiro` · `admin` · `messaging` · `public`.

UI detalhada: `01-clivra-design-system.md` + `.claude/docs/ui/INDEX.md` → **um** shard (Clivra; sem Notion/Orius visual).

## Regras transversais bloqueantes

- Nenhuma camada acessa API exceto **Data**.
- Tipagens em `types/`; enums em `enum/` — **sem** `interfaces/`.
- Arquivos `PascalCase` (`PatientCreateData.ts`, `usePatientListHook.ts`).
- Ops alinhadas ao REST: `List` / `Get` / `Create` / `Update` / `Delete`.
- Hook usa Query/Mutation; invalida `queryKey` no `onSuccess`.
- FormHook; `*FormDialog` com `handleForm`; modais `{isOpen && ...}`.
- **Nunca** existir `frontend/src/packages/*/actions`.
- Package não importa outro package — compartilhar em `shared/`.
- Código compacto: concentrar decisão uma vez; não espalhar ternários redundantes.
- Uma responsabilidade por arquivo/camada; sem hooks/god components inchados nem abstrações “para o futuro”.
- Preferir o caminho mais curto que preserve Page→…→Data — não inventar camada extra.
