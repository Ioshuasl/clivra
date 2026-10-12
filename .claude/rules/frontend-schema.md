---
paths:
  - "frontend/src/packages/**/schemas/**/*"
---

# Frontend — Schema

## Caminho

`frontend/src/packages/<area>/schemas/<Entidade>/<Entidade>Schema.ts`

## Obrigatório

- Zod para form; exportar tipo inferido (`FormValues`).
- Preferir schemas alinhados a `contracts/` quando existirem.
- Usado pelo FormHook via `zodResolver`.

## Proibido

- Chamar API, Data ou Hook.
- Enums de domínio aqui — vão em `enum/`.

Norma: `docs/09`.
