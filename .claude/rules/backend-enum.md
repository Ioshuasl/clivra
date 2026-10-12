---
paths:
  - "backend/src/modules/**/enum/**/*"
---

# Backend — Enum

## Caminho

`backend/src/modules/<dominio>/enum/<entidade>/<nome>.enum.ts`

## Obrigatório

- Enums TypeScript ou objetos `as const` + tipo derivado.
- Valores alinhados ao banco/API em `SCREAMING_SNAKE_CASE` quando forem status/códigos de domínio.
- Um conceito por arquivo; nome exportado claro (`PatientOrigin`).

## Proibido

- Lógica de negócio.
- Tipagens de DTO/ports — vão em `types/`.

Exemplo: `enum/patient/patient_origin.enum.ts`.

Norma: `docs/16-estrutura-de-pastas.md`, `docs/15-glossario.md`.
