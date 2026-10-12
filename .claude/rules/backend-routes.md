---
paths:
  - "backend/src/modules/**/routes/**/*"
---

# Backend — Routes

## Caminho

`backend/src/modules/<dominio>/routes/v1/<entidade>.routes.ts`

## Obrigatório

- Monta rotas REST sob o controller; middlewares `authenticate`, `tenantContext`, `authorize`, `validate`.
- Paths alinhados a `docs/08-api-v1.md` (ex.: `GET/POST /patients`, `GET/PATCH/DELETE /patients/:id`).
- Versão só na borda (`v1/`); services/models sem noção de versão.

## Proibido

- Regra de negócio.
- Chamar repository/service além do controller.

Norma: `docs/08`, ADR-0003.
