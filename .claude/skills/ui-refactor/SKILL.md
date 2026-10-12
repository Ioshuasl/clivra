---
name: ui-refactor
description: >-
  Refatora UI React/Next.js em frontend/ alinhando ao Design System Clivra e
  shards docs/ui, preservando contratos/hooks/services. Use para layout/copy/a11y
  sem mudar arquitetura.
---

# UI/UX Refactor (Frontend) — Clivra

Paths: `frontend/src/packages/**` e `frontend/src/shared/**`.
Arquitetura: `.claude/rules/frontend-*.md` + `docs/09` / `docs/16`.
Visual: [`01-clivra-design-system.md`](../../../01-clivra-design-system.md).

## Política de tokens

Ler **só** o shard do tipo de tela (matriz em [docs/ui/INDEX.md](../../docs/ui/INDEX.md)). Não ler monólito nem `ui-ux-systems` + shard juntos.

| Tela | Shard |
|------|-------|
| Index/Table | `03-crud-index-table.md` |
| Form/Dialog | `04-form-dialog.md` |
| Sidebar/Details | `05-sidebar-details.md` |
| Tokens/átomos | `01-tokens-kit.md` |

Arquitetura: `.claude/rules/frontend-*.md` das camadas tocadas.

## Missão

Melhorar visual/UX/copy/a11y alinhado ao **Clivra** — **sem** mudar payloads, hooks, services ou o fluxo de camadas.

Eliminar resíduos Notion-like / Orius (laranja `#FF781F`, ink `#37352F`, Geist, Inter como identidade).

## Precedência

1. Segurança/dados → 2. Pedido do usuário → 3. Contratos → 4. Escopo → 5. DS Clivra + shard UI + rules → 6. Código (só com autorização)

## Tipos

- **A** pontual · **B** estrutural de tela · **C** incerto → investigar antes

## Fases

`ENQUADRAR → PROTEGER → INVESTIGAR → PLANEJAR → EXECUTAR → VALIDAR → REPORTAR`

- Investigar: componente + **1 shard** + rules (+ DS Clivra se tokens/shell).
- Executar: diff mínimo; preservar FormHook/`handleForm`/modais condicionais/TanStack Query.
- Validar: lint + checklist do shard/`INDEX` + viewport **1366×768**.

## Não faça

Alterar hooks/services sem autorização; inventar APIs; ampliar escopo; commit sem pedido; reescrever página do zero só por visual.

## Saída

```
Escopo: [A|B|C]
Shard UI: [arquivo]
Arquivos: [lista]
Preservado: [contratos]
Validação: [lint / 1366×768]
```
