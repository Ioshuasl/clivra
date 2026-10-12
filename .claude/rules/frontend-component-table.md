---
paths:
  - "frontend/src/packages/**/components/**/*Table.tsx"
---

# Frontend — Component Table

## Obrigatório

- Apresentacional — dados e callbacks por props.
- Usa DataTable + `Columns` dedicado.
- Props em `types/<Entidade>/<Entidade>TableTypes.ts`.
- Cores via tokens Clivra (`bg-background`, `text-foreground`, `border-border`, `muted`, `card`, `primary`); `dark:` só quando o token não cobre.

## Proibido

- Hook remoto, service, data ou API.
- Mutar coleção sem callback do Index.
- Hex, `bg-white`, `text-black` sem justificativa pontual (ex.: QR).
