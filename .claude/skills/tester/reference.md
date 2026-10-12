# Tester — inventário da suite

Atualizar este arquivo quando novos `pnpm test:*`, scripts de aceite ou specs e2e forem adicionados.

## Portas e health

| Serviço | URL / porta | Health |
|---------|-------------|--------|
| Postgres | `5432` | `docker compose` healthy |
| Redis | `6379` | healthy |
| MinIO | `9000` | API up |
| Mailpit | `1025` / `8025` | opcional para e2e e-mail |
| API | `http://localhost:3333` | `GET /health` |
| Worker | `3334` (opcional) | process running / log |
| Frontend | `http://localhost:3001` | `GET /login` |

Credenciais seed: `backend/tests/lib/Credentials.ps1` (`owner@teste.local` / `SenhaForte!99`).

## Fases (`full`)

### quality

| id | comando |
|----|---------|
| typecheck | `pnpm typecheck` |
| arch:check | `pnpm arch:check` |

Lint **não** entra no full default (ruído). Incluir só com `-IncludeLint`.

### unit

| id | comando |
|----|---------|
| test:kms | `pnpm test:kms` |
| test:clinical-crypto | `pnpm test:clinical-crypto` |
| test:split-installments | `pnpm test:split-installments` |
| test:receipt-amount-in-words | `pnpm test:receipt-amount-in-words` |
| test:rls | `pnpm test:rls` |

### smoke

| id | comando |
|----|---------|
| test:identity | `pnpm test:identity` |
| test:clinic | `pnpm --filter @repo/backend test:clinic` |
| test:patients | `pnpm --filter @repo/backend test:patients` |
| test:scheduling | `pnpm --filter @repo/backend test:scheduling` |
| test:outbox | `pnpm test:outbox` |
| test:public-booking | `pnpm test:public-booking` |
| test:waitlist | `pnpm test:waitlist` |
| test:messaging | `pnpm test:messaging` |
| test:messaging-inbox | `pnpm test:messaging-inbox` |
| test:anamnesis | `pnpm test:anamnesis` |
| test:odontogram | `pnpm test:odontogram` |
| test:clinical-notes | `pnpm test:clinical-notes` |
| test:attachments | `pnpm test:attachments` |
| test:quotes-crud | `pnpm test:quotes-crud` |
| test:quotes-send | `pnpm test:quotes-send` |
| test:quotes-decision | `pnpm test:quotes-decision` |
| test:treatments-execute | `pnpm test:treatments-execute` |
| test:billing-payments | `pnpm test:billing-payments` |
| test:billing-cash | `pnpm test:billing-cash` |
| test:billing-payables | `pnpm test:billing-payables` |
| test:billing-reports | `pnpm test:billing-reports` |
| test:reporting-dashboard | `pnpm test:reporting-dashboard` |
| test:reporting-export | `pnpm test:reporting-export` |
| test:subscription | `pnpm test:subscription` |

### acceptance

Descoberto em runtime: pastas `backend/tests/<modulo>/*.ps1` (exceto `Run-*.ps1` / `_*.ps1`).

Runner: `backend/tests/Invoke-Acceptance.ps1 -Module <modulo>`

Hoje com scripts reais: `identity`, `billing` (+ `billing/Run-S6.ps1` opcional via `-IncludeBillingBundle`).

### e2e

| id | comando |
|----|---------|
| playwright | `pnpm test:e2e` |

Specs em `e2e/*.spec.ts`. Playwright pode reusar API/web já no ar (`reuseExistingServer`).

## Flags de Invoke-Tester.ps1

| Flag | Efeito |
|------|--------|
| `-Tunnel` | Abre localtunnel FE+API |
| `-SkipStack` | Não chama Ensure-Stack |
| `-SkipSeed` | Não roda db:seed (desvio; perguntar se o usuário não pediu) |
| `-SkipE2E` | Pula Playwright |
| `-SkipAcceptance` | Pula PowerShell aceite |
| `-Only a,b` | Só fases listadas (`quality,unit,smoke,acceptance,e2e`) |
| `-IncludeLint` | Adiciona `pnpm lint` em quality |
| `-IncludeBillingBundle` | Roda também `backend/tests/billing/Run-S6.ps1` |
| `-ReportPath` | Path do markdown de saída |

## Artefatos

Pasta `.claude/skills/tester/.run/` (gitignored):

- `last-report.md`
- `results.json`
- `api.log` / `worker.log` / `web.log` (se Ensure-Stack subiu processos)
- `tunnel.json` / `tunnel-api.pid` / `tunnel-web.pid`
