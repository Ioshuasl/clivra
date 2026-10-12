---
paths:
  - "frontend/src/packages/**/components/**/*Index.tsx"
---

# Frontend — Component Index

## Obrigatório

- Orquestra Header, Table, FormDialog/dialogs e hooks — **não** chama API/Data/Service.
- Lista: `usePatientListHook` (TanStack Query); Table recebe `data` do `query.data`.
- Após create/update/delete: invalidação via Mutation hooks (não refetch manual espalhado).
- Modais só montam quando abertos **e** entram via `next/dynamic` (não import estático):

```tsx
const PatientFormDialog = dynamic(
  () => import('.../PatientFormDialog').then((m) => m.PatientFormDialog),
  { ssr: false },
);

{isFormOpen && <PatientFormDialog ... />}
```

- Repassa callbacks aos filhos (`onEdit`, `onDelete`, …).
- Cores via tokens Clivra (`bg-background`, `text-foreground`, `border-border`, `muted`, `card`, `primary`); `dark:` só quando o token não cobre.

## Proibido

- Montar payload/endpoint/`fetch`.
- CollectionHook legado obrigatório.
- Sempre renderizar FormDialog fechado.
- Nomear modal como `*Form` — modal é `*FormDialog`.
- `FadeIn` / `Stagger` / `motion` no Index (lista visível sem animação de lib).
- Hex, `bg-white`, `text-black` sem justificativa pontual (ex.: QR). Recriar `ThemeToggle` na tela.

Norma: `docs/09`, `docs/16`.
