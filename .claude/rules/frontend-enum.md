---
paths:
  - "frontend/src/packages/**/enum/**/*"
---

# Frontend — Enum

## Caminho

`frontend/src/packages/<area>/enum/<Entidade>/<Nome>Enum.ts`

## Obrigatório

- Enums / mapas `as const` alinhados ao backend/API.
- Arquivo `PascalCase`.
- Um conceito por arquivo quando fizer sentido.

## Proibido

- Tipagens de props/DTO — vão em `types/`.
- Lógica de UI.

Exemplo: `enum/Patient/PatientOriginEnum.ts`.

Norma: `docs/16`.
