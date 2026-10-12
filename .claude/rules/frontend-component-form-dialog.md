---
paths:
  - "frontend/src/packages/**/components/**/*FormDialog.tsx"
---

# Frontend — Component FormDialog

**Nomenclatura:** `*FormDialog` = modal. Página → `*Form`.

## Obrigatório

- Arquivo: `<Entidade>FormDialog.tsx` + props em `types/<Entidade>/<Entidade>FormDialogTypes.ts`.
- Form via `use<Entidade>FormHook()`.
- Extrair reset para `handleForm`; `useEffect` só chama essa função.
- Index monta só quando aberto **e** via `next/dynamic` (sem import estático do dialog).
- Motion (`MotionDialogBody`) só neste chunk lazy — nunca no Index/Form.
- Cores via tokens Clivra (`bg-background`, `text-foreground`, `border-border`, `muted`, `card`, `primary`); `dark:` só quando o token não cobre.

## Proibido

- Nomear modal como `*Form`.
- Acessar Data/API.
- Renderizar sempre montado quando fechado.
- Hex, `bg-white`, `text-black` sem justificativa pontual (ex.: QR). Recriar `ThemeToggle` na tela.

Norma: `docs/09`, `.claude/docs/ui/04-form-dialog.md`.
