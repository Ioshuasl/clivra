---
paths:
  - "frontend/src/packages/**/services/**/*"
---

# Frontend — Service

## Caminho

`frontend/src/packages/<area>/services/<Entidade>/PatientListService.ts`

## Obrigatório

- Chama apenas Data da mesma ação.
- Sem montar URL / sem `fetch` direto.
- PascalCase: `PatientCreateService.ts`.

## Proibido

- TanStack Query (fica no Hook).
- Regra de domínio do servidor.

Norma: `docs/09`, `docs/16`.
