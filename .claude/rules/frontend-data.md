---
paths:
  - "frontend/src/packages/**/data/**/*"
---

# Frontend — Data

## Caminho

`frontend/src/packages/<area>/data/<Entidade>/PatientListData.ts` (etc.)

## Obrigatório

- Um arquivo por operação REST: `List` / `Get` / `Create` / `Update` / `Delete`.
- Único lugar que usa `api-client` / `fetch` tipado.
- PascalCase: `PatientCreateData.ts`.

## Proibido

- Regra de negócio / TanStack Query / manipulação de UI state.
- Chamar Service/Hook.

Norma: `docs/09`, `docs/16`.
