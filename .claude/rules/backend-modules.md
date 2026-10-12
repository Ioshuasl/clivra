---
paths:
  - "backend/src/modules/**/*"
---

# Backend — Modules

## Caminho

`backend/src/modules/<dominio>/`

Bounded contexts (MVP): `identity` · `clinic` · `patients` · `scheduling` · `clinical-records` · `treatments` · `billing` · `messaging` · `reporting` · `subscription`.

Superfície HTTP transversal: `modules/platform/` (auditoria consultável, LGPD/export, DSR, break-glass, `/ready`) — alinhado a `docs/16`. **Não** é BC clínico.

Gravação de auditoria, outbox infra, health liveness e RLS → **`shared/`**. `writeAuditLog` permanece em `shared/database/write_audit.ts`. `platform` não importa internals dos outros módulos.

Norma: `docs/16`, ADR-0001, `docs/05`.

## Fronteira entre módulos

- Cruzar módulo **somente** via `<dominio>_public.ts` (ex.: `patients_public.ts`).
- Consumidor importa só a API pública; **proibido** importar `services/`, `repositories/`, `models/`, `controllers/` de outro módulo.
- Port de saída tipado em `types/ports/`; implementação no próprio módulo ou adapter em `shared/integrations/` quando for API externa.

## Dentro do módulo

Layout canônico: `models` · `types` · `enum` · `schemas` · `repositories` · `actions?` · `services` · `controllers` · `routes` · `jobs` · `subscribers` · `helpers` · `<dominio>_public.ts` · `<dominio>.module.ts`.

- Fluxo HTTP: `Routes → Controller → Service → [Action?] → Repository`.
- Prisma só em `repositories/` (+ `shared/database/`).
- DI / registro de rotas: `*.module.ts`.

## Quando criar módulo novo

Perguntar ao usuário. Critérios típicos: novo bounded context com linguagem ubíqua própria, ciclo de vida e permissões distintos — não “pasta utilitária”.

## Proibido

- Import cruzado profundo entre módulos.
- Regra de negócio de um BC em outro (usar evento/outbox ou port síncrono documentado).
- Colocar entidade de domínio clínica em `shared/`.

## Em dúvida

Perguntar: BC dono da regra, sync (port) vs async (outbox), se o artefato é público no `*_public.ts`.
