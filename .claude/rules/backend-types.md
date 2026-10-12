---
paths:
  - "backend/src/modules/**/types/**/*"
---

# Backend — Types

## Caminho

`backend/src/modules/<dominio>/types/`

- I/O / DTOs: `types/<entidade>/<entidade>_<op>.types.ts`
- Ports: `types/ports/<nome>.port.ts`

## Obrigatório

- Tipagens TypeScript do módulo (input/output, summaries, ports).
- Ports de saída (clock, storage, outro módulo) em `types/ports/`.
- Arquivo `snake_case`.
- **Não existe pasta `interfaces/`.**

## Proibido

- Regra de negócio / validação Zod / Prisma.
- Enums aqui — vão em `enum/`.

Exemplo canônico: `types/patient/patient_create.types.ts`, `types/ports/clinical_records.port.ts`.

Norma: `docs/16-estrutura-de-pastas.md`.
