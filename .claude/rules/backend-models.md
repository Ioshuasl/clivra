---
paths:
  - "backend/src/modules/**/models/**/*"
---

# Backend — Models

## Caminho

`backend/src/modules/<dominio>/models/`

## Obrigatório

- Entidades, value objects, eventos de domínio, erros de domínio, domain services.
- Invariantes no modelo (ex.: não remarcar agendamento concluído).
- Zero dependência de Express, Prisma, Zod, HTTP, Node I/O (exceto libs puras permitidas: `date-fns`, `uuid`).
- Arquivo `snake_case` / `kebab` conforme `docs/16` (ex.: `patient.model.ts`, `cpf.vo.ts`).

## Proibido

- Importar `@prisma/client`, `express`, `zod`.
- Model anêmico (só getters/setters) com regra no service.
- Tipagens de I/O HTTP aqui — isso é `types/` ou `schemas/`.

Norma: `docs/05-arquitetura.md`, `docs/16-estrutura-de-pastas.md`.
