# Sprint 0 — Fundação técnica

**Objetivo:** monorepo, Docker Compose, Express `/health`, Next.js layout + login mock, Prisma esqueleto, base de env/segurança.

Checklist (roadmap [`docs/13`](../../13-roadmap-estimativas.md)):

- [x] Pasta `docs/desenvolvimento/`
- [x] Workspaces pnpm (`backend`, `frontend`, `contracts`)
- [x] `docker-compose.yml` (postgres, redis, minio, mailpit)
- [x] Backend Express + `/health` + env Zod
- [x] Frontend Next.js + layout + login mock
- [x] Prisma schema mínimo
- [x] `typecheck` verde (backend + frontend) + smoke `/health`
- [x] CI workflow (quality + integration RLS) + gitleaks config
- [x] Middlewares segurança esqueleto (`helmet`, CORS, requestId) — do scaffold
- [x] `arch:check` (dependency-cruiser)
- [x] Primeira migração + RLS (`20260811180000_init_rls`)
- [x] Esqueleto `audit_log` na migração
- [x] `TenantPrisma` + `pnpm test:rls` verde local
- [x] Port `KeyManagementPort` stub (`LocalKeyManagementAdapter` + `pnpm test:kms`)
- [x] ESLint real (`eslint.config.mjs` + typescript-eslint type-aware)
- [x] Confirmar CI verde no GitHub após push
  ([run af543c0](https://github.com/Ioshuasl/clivra/actions/runs/31531294140) — Quality + Integration success)

## Bloqueios

_Nenhum no momento._

## Notas

- Domínios/TLS: EasyPanel ([ADR-0014](../../adr/0014-deploy-easypanel-dominios.md)) — Dockerfiles depois.
- Nome comercial do produto ainda não congelado; packages usam escopo `@repo/*`.
- Se o Postgres local já existia sem roles: `docker compose down -v` e sobe de novo (init em `docker/postgres/init`).
- Runtime usa `app_user`; migrações usam `DATABASE_MIGRATION_URL` (postgres local).
- Fronteiras de módulo: `dependency-cruiser` (CI); ESLint type-aware no código de `src/`.
