---
paths:
  - "frontend/src/packages/**/components/**/*Columns.tsx"
---

# Frontend — Component Columns

## Obrigatório

- Arquivo isolado (`ColumnDef`).
- Callbacks `onEdit`/`onDelete` do Index.
- Labels de ação curtas + ícone (`Editar`, `Remover`).
- Cores via tokens Clivra (`bg-background`, `text-foreground`, `border-border`, `muted`, `card`, `primary`); `dark:` só quando o token não cobre.

## Proibido

- API, data, service ou hook.
- Labels longas com nome da entidade.
- Hex, `bg-white`, `text-black` sem justificativa pontual (ex.: QR).
