---
paths:
  - "frontend/src/packages/**/components/**/*Select.tsx"
---

# Frontend — Component Select

## Obrigatório

- Arquivo `<Entidade>Select.tsx` + props em `types/<Entidade>/…SelectTypes.ts`.
- Carrega via **List/Get hook** (TanStack Query) — nunca Data/API no Select.
- Combobox acessível (Popover/Command ou DS do projeto).
- Cores via tokens Clivra (`bg-background`, `text-foreground`, `border-border`, `muted`, `card`, `primary`); `dark:` só quando o token não cobre.

## Proibido

- Props tipadas só inline se o contrato for reutilizado.
- Chamar Data/`fetch`/Service fora do Hook.
- Hex, `bg-white`, `text-black` sem justificativa pontual (ex.: QR). Recriar `ThemeToggle` na tela.
