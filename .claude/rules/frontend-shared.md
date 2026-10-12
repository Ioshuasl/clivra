---
paths:
  - "frontend/src/shared/**/*"
---

# Frontend — Shared

Não faz parte do fluxo CRUD do package.

## Caminho

`frontend/src/shared/{ui,layout,api,hooks,auth,helpers,styles}/…`

## Obrigatório

- Só o que já tem **2+ consumidores reais**.
- UI genérica em `shared/ui` (burra: props, sem domínio).
- `api-client` / `query-client` em `shared/api`.
- Package **não** importa outro package — sobe para `shared/`.

## Proibido

- Domínio de uma única entidade.
- `frontend/src/packages/*/actions`.
- Pasta `interfaces/` — tipagens transversais em pasta clara (`helpers`, tipos junto do componente, etc.).
- **`shared/ui/index.ts`** e qualquer barrel de primitivos (`import { Button } from '@/shared/ui'`). Importar o arquivo: `@/shared/ui/button`.
- Importar `@/shared/ui/sidebar` no app — usar `sidebar-context` / `sidebar-chrome` / `sidebar-panel` / `sidebar-menu`.
- `FadeIn` / `Stagger` / motion em Index ou Form de página. Motion só em `*FormDialog` (chunk `next/dynamic`).

Norma: `docs/09`, `docs/16`.
