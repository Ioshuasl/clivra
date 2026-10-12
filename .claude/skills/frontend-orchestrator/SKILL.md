---
name: frontend-orchestrator
description: >-
  Orquestra telas CRUD no frontend Next.js por camadas (types, enum, schema,
  data, service, hook TanStack Query, components, page). Use ao criar ou ajustar
  UI em frontend/. Fonte: docs/16 + docs/09 + rules .claude.
---

# Frontend Orchestrator

## Objetivo

Implementar/corrigir `frontend/` no fluxo:

`Page → Component → Hook → Service → Data → API`

## Política de tokens

**Ordem:** classificar tipo de tela → rules das camadas → no máx. **1–2** shards em `.claude/docs/ui/` (identidade **Clivra**; norma `01-clivra-design-system.md`) → implementar → [checklist.md](checklist.md) no fim.  
[layers.md](layers.md) só se a camada não estiver clara. **Proibido** Notion-like / Orius visual.

## Gate de pergunta (obrigatório)

**Nunca tomar decisão de forma autônoma.** Em dúvida, ambiguidade ou **qualquer escolha** (tipo de tela, package, campos do form, modal vs página, copy, navegação, contrato com a API, etc.) → **perguntar ao usuário e pausar** até a resposta.

Só segue sem perguntar o que já está **explícito** na instrução do usuário ou **fechado** em `docs/` / rules (ex.: fluxo Page→…→Data, TanStack Query no Hook, `*Form` vs `*FormDialog`).

| Perguntar (sempre) | Seguir sem perguntar |
|--------------------|----------------------|
| Dúvida ou 2+ caminhos válidos | Convenção já normativa em `docs/16` / `docs/09` / rules |
| Package, tipo de tela, shape de UI ambíguos | Ops List/Get/Create/Update/Delete já definidas |
| Campos, validação ou fluxo de UX não especificado | — |

## Execução

1. Classificar package + entidade + tipo de tela + operações (`List|Get|Create|Update|Delete`).
2. Ler rules afetadas.
3. Implementar: types/enum/schema → data → service → hooks (Query/Mutation) → components → page.
4. Checklist + lint se disponível.

## Kit UI (shadcn em `shared/ui`)

Path normativo: `frontend/src/shared/ui/` — imports via alias:

```ts
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { cn } from '@/shared/helpers/utils'
```

| Regra | Detalhe |
|-------|---------|
| **Compor, não recriar** | Usar primitivos já instalados em `shared/ui` antes de escrever UI custom |
| **Sem `@/components/ui`** | Não usar path default do shadcn; o projeto fixou `shared/ui` em `components.json` |
| **Componentes de domínio** | Ficam em `packages/<package>/components/`; importam de `@/shared/ui/*` |
| **Tema claro/escuro** | Cores só com tokens (`bg-background`, `text-foreground`, `border-border`, `muted`, `card`, `accent`). Hex / `bg-white` / `text-black` só com justificativa (ex.: QR). `dark:` só se o token não cobrir. `ThemeToggle` e `next-themes` ficam no layout — não recriar na tela CRUD |
| **Dúvida de primitivo** | Shard [07-ui-components-map.md](../../docs/ui/07-ui-components-map.md) (máx. 1 por turno) |
| **Adicionar/ajustar primitivo shadcn** | Skill `shadcn` (CLI/registry) — não no meio de um CRUD de tela |
| **Decisão visual/UX ampla** | Skill `ui-ux-pro-max` (paleta, tipografia, a11y) — opcional no início de telas novas |

## Rules

Ver `rules/frontend.md` e `frontend-*.md`.

## Regras críticas

- **Nunca decidir sozinho** — dúvida ou escolha → perguntar e pausar.
- Monólito modular (packages) + Clean no fluxo + SOLID; código simples/direto — sem over-engineering.
- Data = único HTTP; Hook = TanStack Query; sem CollectionHook obrigatório.
- Tipagens em `types/`; enums em `enum/`; sem `interfaces/`.
- PascalCase nos arquivos; `*Form` vs `*FormDialog`.
- Package não importa outro package.
- UI não duplica invariantes de domínio do backend.
- Primitivos visuais só de `@/shared/ui/*`; compor variantes existentes (`variant`, `size`) antes de CSS ad hoc.
- Cores via tokens CSS Clivra (claro/escuro); sem hex/`bg-white` salvo justificativa; sem recriar `ThemeToggle` na tela; sem identidade Notion/Orius.

## Saída

```
Implementado: [resumo]
Arquivos: [lista]
Validação: [lint/pendências]
Bloqueios: [se houver]
```
