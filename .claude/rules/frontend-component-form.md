---
paths:
  - "frontend/src/packages/**/components/**/*Form.tsx"
---

# Frontend — Component Form

**Nomenclatura:** `*Form` = formulário de **página**. Modal → `*FormDialog`.

## Obrigatório

- Arquivo: `<Entidade>Form.tsx`.
- Form via `use<Entidade>FormHook()` — sem `useForm`/resolver/`defaultValues` no JSX.
- `form.handleSubmit(onSave, onError)`.
- Props tipadas em `types/<Entidade>/<Entidade>FormTypes.ts`.
- Form longo: Sidebar sticky **360px** quando o padrão exigir.
- Cores via tokens Clivra (`bg-background`, `text-foreground`, `border-border`, `muted`, `card`, `primary`); `dark:` só quando o token não cobre.

## Proibido

- Encapsular em `Dialog` — isso é `*FormDialog`.
- Acessar Data/API.
- Decidir POST/PUT no Form (isso é no Data).
- `FadeIn` / `Stagger` / `motion` no Form de página.
- Hex, `bg-white`, `text-black` sem justificativa pontual (ex.: QR). Recriar `ThemeToggle` na tela.

Norma: `docs/09`, `.claude/docs/ui/04-form-dialog.md` / `05` se precisar.
