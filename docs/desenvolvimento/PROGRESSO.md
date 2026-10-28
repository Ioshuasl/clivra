# Progresso de desenvolvimento (log)

Append-only. Entradas mais recentes no topo.

---

## 2026-10-13 — S9 Bloco 7: homologação no sandbox do Asaas

### Feito

- Homologação com o app real + Asaas sandbox + túnel Cloudflare: Pix, boleto, cartão, webhooks (`PAYMENT_*`, `SUBSCRIPTION_*`, `CHECKOUT_*`), ativação, cancelamento
- Achados que mudaram o desenho: cartão sem `customer` (exige telefone+endereço), ligação ao tenant pelo id do checkout (`platform.asaas_checkout_link`), URLs de retorno públicas, cartão cobra só no fim do teste
- Cancelar durante o teste só desfaz a cobrança agendada; `SUBSCRIPTION_DELETED` de recorrência antiga é ignorado; evento sem tenant espera 24 h por vínculo
- UI: "cartão cadastrado, 1ª cobrança em dd/mm"; sem CPF/CNPJ no cartão; sem "Pagar" em fatura de cartão
- Roteiro repetível `scripts/homolog-asaas-sandbox.ts`; runbook `docs/runbooks/billing-asaas.md`; ADR-0017 com emenda; DDT §16 respondida

### Validação

- Smokes `test:asaas-adapter`, `test:subscription-checkout`, `test:asaas-webhook`, `test:subscription` verdes; Playwright `subscription-checkout` 8/8 e `subscription` 3/3
- Sandbox real: todos os cenários do roteiro passaram (o do cartão com pagamento manual de teste)

### Pendente (produção)

- Conta de produção/limites PF/NFS-e; chave e token de produção; cobrança real de baixo valor; alertas ativos; worker rodando (reparo da S8)

---

## 2026-10-13 — S9 Blocos 5–6: checkout e cobranças (frontend)

### Feito

- `/app/assinatura/checkout`: escolha de plano (3 colunas), forma de pagamento (Pix, cartão, boleto), CPF/CNPJ e resumo fixo; Pix/boleto na própria página, cartão via Asaas Checkout; confirmação por polling
- `/app/assinatura/retorno`: sucesso/cancelado/expirado; o retorno do navegador nunca ativa a assinatura
- `SubscriptionIndex` reescrito (plano, uso, faturas, CTA por estado, pagar fatura em aberto, cancelar com confirmação); `SubscriptionBanner` com CTA novo e oculto nas telas de assinatura
- Camada Data/Service/Hook nova (checkout, cancelar, faturas, pagar) + FormHook + schema Zod; máscara de CPF/CNPJ
- Backend: `GET /subscription` expõe `billingMethod`, `billingProvider`, `hasRecurringBilling`, `checkoutAvailable`
- E2E `subscription-checkout.spec.ts` (7 cenários, API de assinatura simulada no navegador) + `subscription.spec.ts` ajustado (item Assinatura vive dentro de Configurações; textos novos)

### Validação

- Playwright: `subscription-checkout` 7/7 e `subscription` 3/3 numa pilha isolada (API 3433 + web 3012) — visual conferido em 1366×768
- `tsc`/ESLint sem erros novos nos arquivos da S9; `test:subscription` (backend) verde

### Achados do ambiente (não são da S9)

- O `.env` só libera CORS para as portas 3000/3001, mas `pnpm dev:web` usa a **3002**: o login no navegador falha com "Não foi possível conectar à API". Foi preciso subir uma pilha isolada para validar
- `next-themes` estava declarado mas não instalado (web respondia 500); rodei `pnpm install --frozen-lockfile`
- O banco local não tinha o seed (`pnpm db:seed`)
- `e2e/subscription.spec.ts` já falhava no HEAD (procurava o link "Assinatura" fora do grupo Configurações)

### Pendente

- Bloco 7 (sandbox real, runbooks, go-live); alertas ativos; upgrade/downgrade e troca de cartão (Should)
- Cenário E2E de boleto; paginação das faturas

---

## 2026-10-13 — S9 Blocos 1–4: cobrança da assinatura via Asaas (backend)

### Feito

- Migração `20261013000000_s9_billing_asaas`: `subscription.billing_method|billing_provider`, `subscription_payment`, `subscription_checkout` (RLS) e `platform.asaas_link` / `platform.asaas_event` (sem RLS de tenant)
- Env `BILLING_PROVIDER` (`manual` padrão = kill switch) + `ASAAS_*` com validação no boot (prefixo da chave × ambiente, token ≠ API key)
- Port `SubscriptionBillingPort`; adapters Asaas e Manual; cliente HTTP em `shared/integrations/asaas/` (timeout 60 s, GET com retry, POST nunca repetido às cegas)
- `POST /subscription/checkout` (Pix/boleto na resposta; cartão via Asaas Checkout), `POST /subscription/cancel`, `GET /subscription/payments[/:id/pay]`; Idempotency-Key; retry após timeout adota a assinatura existente
- `POST /webhooks/asaas`: token em tempo constante, `UNIQUE` no id do evento, `200` sempre que válido; worker `process-asaas-event`; varredor de eventos presos
- Status derivado das cobranças (`billing_state.model`): `PAST_DUE` por atraso, `ACTIVE` por pagamento, `CANCELLED` final; job `suspend-past-due` (7 dias) e `reconcile-asaas-subscriptions` + `ops-asaas-reconcile.ts`
- Smokes novos com Asaas fake (`scripts/lib/asaas_fake_server.ts`): `test:asaas-adapter` (15), `test:subscription-checkout` (30), `test:asaas-webhook` (28); CI com 3 passos novos
- Guard: `/subscription/checkout|cancel|ops/*` liberados em read-only (quem está EXPIRED/SUSPENDED precisa pagar ou ser reativado pela operação)

### Validação

- `test:asaas-adapter` · `test:subscription-checkout` · `test:asaas-webhook` · `test:subscription` · `test:rls` verdes; `arch:check` limpo; ESLint limpo nos arquivos novos; `tsc` sem erros novos
- `test:subscription` (legado) estava falhando no HEAD (reativar tenant read-only por `ops/status` caía no guard); passa com a allowlist

### Estado do repositório que impacta esta entrega (pré-existente, não corrigido aqui)

- `backend/src/worker.ts` referencia jobs/nomes da S8 que não existem no HEAD (`tenantExportJob`, `JOB.tenantExport`, `anomalyClinicalReadJob`, `ANOMALY_INTERVAL_MS` etc.); o worker não sobe como está. Os jobs da S9 estão registrados lá, mas só rodam depois desse reparo
- ~80 erros de `tsc` pré-existentes em reporting, messaging, platform, `AuditAction` (`CLINICAL_READ`, `NOTE_*`, `EXPORT_*`…) e `subscription_ops`/`usage` (arquivos legados duplicados)
- O cliente Prisma gerado estava defasado do `schema.prisma` (`platform_role`); foi preciso `prisma generate`

### Pendente

- Blocos 5–6 (frontend) e 7 (sandbox real, runbooks, go-live)
- Alertas ativos (Sentry/métricas); upgrade/downgrade e troca de cartão (Should)
- Validar no sandbox: `customer` no Checkout, payload dos eventos `CHECKOUT_*`, URL do checkout sandbox

### Próximo

- Reparar o `worker.ts`/wiring da S8 e então S9 Bloco 5 (frontend de checkout)

---

## 2026-09-12 — S7 fechada: aceite via skill tester

### Feito

- `pnpm tester` full verde: Pass=36 Fail=0 Skip=1 (tunnel off)
- Smokes S7: `messaging-inbox`, `reporting-dashboard`, `reporting-export`, `subscription`
- Playwright full (incl. inbox / dashboard / assinatura / regressão S0–S6)
- Fixes de aceite: datas relativas em `smoke-billing-payables`; listagem de installments sem status só pagáveis; e2e agenda em dia útil/manhã; helper billing filtra OPEN/PARCIAL/OVERDUE
- Checklist [S7](./sprints/S7-inbox-relatorios-billing-saas.md) + README desenvolvimento: **fechada**
- Cobrança SaaS continua manual (ADR-0010) — Stripe **não** entrou

### Validação

- Relatório: `.cursor/skills/tester/.run/last-report.md`

### Próximo

- S8 — endurecimento, LGPD, piloto
- M2 (WA real) / M3 (uso real S4) / M5 (piloto) fora do código Must S7

---

## 2026-08-17 — S7 planejada (checklist)

### Feito

- Checklist [`sprints/S7-inbox-relatorios-billing-saas.md`](./sprints/S7-inbox-relatorios-billing-saas.md) no mesmo padrão da S6
- Escopo: E8b Must (inbox RF-E8-07..09) + E9 Must (dashboard/GETs/export) + E10 Must (trial/limites/suspensão **manual**, ADR-0010)
- 7 blocos (5 backend + 2 frontend); cortes fechados (sem Stripe; rotas E7 billing estáveis; `/app/inbox` vs `/app/whatsapp` settings; reporting + subscription BCs novos)
- README desenvolvimento aponta S7 como fase atual

### Validação

- Fontes: RF E8/E9/E10, módulos 08–10, ADR-0010/0016, herança S3 stubs conversation + S6 reports E7

### Próximo

- S7 Bloco 1 — backend inbox foundation

---

## 2026-08-17 — S6 fechada: frontend + aceites + M4 local

### Feito

- Blocos 6–7: package `financeiro` (Receber, Caixa, Pagar, Fluxo, Inadimplência, Produção) + aba Financeiro na ficha
- Playwright **12/12**: `e2e/billing-payments.spec.ts` + `billing-cash.spec.ts` + `billing-cash-flow.spec.ts` (M4)
- Aceite backend local (smokes + curl/`backend/tests`) e frontend (nav por papel, recibo ≠ NFS-e, COPY)
- `backend/tests/` (scripts por módulo + `Invoke-Acceptance.ps1` + `billing/Run-S6.ps1`); Compose `minio-init` para bucket `odonto-dev`
- Checklists [S6](./sprints/S6-financeiro.md) marcados; Estado = fechada; M4 demo local

### Validação

- Playwright local contra FE `:3001` / API `:3333` / worker: 12 passed
- Aceite identity + `billing/roles_permissions` via `backend/tests`

### Próximo

- S7 — inbox E8b + dashboard/export E9 + billing SaaS E10
- M3 uso real S4 (não bloqueia S7)
- Carry-over: RF-E7-19 bloqueio de agenda (Could); `appointment.treatment_item_id` → `SCHEDULED` (S5)

---

## 2026-08-14 — S6 Bloco 5: recibo PDF, send, relatórios E7

### Feito

- Job `generate-receipt-pdf` (outbox `billing.payment_registered`); `GET /payments/:id/receipt` URL 15 min; PDF sem clínico + “não é nota fiscal”
- `POST /payments/:id/send-receipt` (WA CONNECTED → senão e-mail → COPY) + templates `payment_receipt` / `payment_overdue`
- `POST /installments/:id/charge` (RF-E7-18, envio manual)
- `GET /reports/cash-flow` (CASH ≠ ACCRUAL), `/overdue` (faixas 1–15/16–30/31–60/60+), `/production` (escopo dentista)
- Smoke `pnpm test:billing-reports`; CI passo correspondente

### Validação

- `pnpm --filter @repo/backend db:migrate` + `db:generate` + typecheck + `test:billing-reports` + `arch:check`

### Próximo

- S6 Bloco 6 — frontend AR + baixa + recibo

---

## 2026-08-14 — S6 planejada (checklist)

### Feito

- Checklist [`sprints/S6-financeiro.md`](./sprints/S6-financeiro.md) no mesmo nível da S5
- Escopo: E7 Must (AR + baixa/estorno + crédito + AP + caixa + fluxo + overdue + recibo + produção); marco M4
- 7 blocos (5 backend + 2 frontend); cortes fechados (sem módulo `reporting`; sem NFS-e/export job; crédito via ledger; CASH exige sessão; aging = RF 1–15/16–30/31–60/60+)
- README desenvolvimento aponta S6 como fase atual

### Validação

- Fontes: RF E7, módulo billing, docs/08 §2.7, docs/07 §7, docs/09 §4.5, herança S5 (`billing_public` + parcelas)

### Próximo

- S6 Bloco 1 (DDL payment/caixa/AP/crédito + RLS + counter de recibo)

---

## 2026-08-14 — Docs: Cloud API → WAHA (sem código)

### Feito

- [ADR-0016](../adr/0016-waha-default-messaging.md) Aceito; [ADR-0005](../adr/0005-whatsapp-cloud-api.md) supersedido; [ADR-0015](../adr/0015-avaliacao-gateways-whatsapp-nao-oficiais.md) como pesquisa
- Plano [migracao-waha.md](./migracao-waha.md) (QR no app, GOWS, sem crédito Meta, botões + fallback)
- RF E8, módulo 08, API §2.8 / §3.5, DDL `whatsapp_account`, roadmap R1, visão D1 alinhados

### Próximo

- Código do adapter WAHA **só quando pedido**
- S6 — E7 baixa/caixa (M4)

---

## 2026-08-14 — S5 fechada: smokes, Playwright, aceite, CI S4

### Feito

- Smokes S5 verdes: `test:quotes-crud` / `test:quotes-send` (`NODE_ENV=test`) / `test:quotes-decision` / `test:treatments-execute`
- Playwright 9/9: `e2e/quotes.spec.ts` + `e2e/quote-public.spec.ts` + `e2e/treatment-execute.spec.ts`
- Seed Maria DRAFT 3 itens (RES-01 26 + PROF-01 + RAD-01 16); `GET /procedures` com `quotes.read|write` para a recepção
- CI: `test:clinical-crypto` no quality; smokes S4 (`anamnesis` / `odontogram` / `clinical-notes` / `attachments`) no integration
- Execute não abre TX aninhada em `clinic_public` (profissional já resolvido); painel mantém banner de evolução se o plano completar
- Checklists de aceite (backend, frontend, produto) marcados em [S5](./sprints/S5-orcamentos-tratamentos.md)

### Validação

- Playwright local contra `pnpm dev` (`:3001` / `:3333`): 9 passed
- Demo pública 2-de-3 consome o DRAFT da Maria — `pnpm db:seed` recria o orçamento para repetir

### Próximo

- S6 — E7 baixa/caixa (M4)
- M3 uso real S4 (não bloqueia S6)
- Should `appointment.treatment_item_id` → `SCHEDULED` se couber depois

---

## 2026-08-14 — S5 Bloco 7: plano no atendimento (`clinico`)

### Feito

- `PlanPlaceholder` substituído por `TreatmentPlanPanel` (ACTIVE + executar + evolução)
- E2E `e2e/treatment-execute.spec.ts`: Dra. Ana executa RES-01 dente 26 → RESTORED

### Próximo

- Aceite de produto S5 (fechado na entrada acima)

---

## 2026-08-14 — S5 Bloco 6: frontend orçamentos (operacional + public + ficha)

### Feito

- `/app/orcamentos` Index/FormDialog (DRAFT, send COPY, duplicar, PDF, decisão presencial)
- Ficha: aba Orçamentos (`quotes.read`) + timeline `QUOTE`
- Público `/orcamento/[token]` (parcial, rejeitar, copy “Proposta comercial”)
- E2E quotes + quote-public; recepção vê catálogo e não vê Prontuário; ASB/FINANCE sem nav

### Próximo

- S5 Bloco 7 — plano no atendimento

---

## 2026-08-14 — S5 Bloco 5: plano, execute, odontograma, produção, cancel

### Feito

- `GET /treatment-plans` + `/:id` com progresso (`progressPercent`, `executedCents`, `pendingCents`)
- `POST /treatment-items/:id/execute` e batch: note assinada + odontograma `PROCEDURE_EXECUTION` + `production_entry` na mesma TX
- Mapa `RES/EXO/IMP/PROT/END` → condição; override `toothState`; CRO obrigatório; recepção 403
- Cancel `PLANNED`/`SCHEDULED`; executado `422 ITEM_ALREADY_EXECUTED`; plano `COMPLETED`/`CANCELLED`
- `POST /notes` com `treatmentItemIds` → 422 hint execute; timeline `QUOTE` via `treatments_public`
- Smoke `pnpm test:treatments-execute` + passo no `ci.yml`; docs/08 §2.6 Bloco 5

### Validação

- `typecheck` · `arch:check` a executar no gate. Smoke precisa do Postgres em `:5432`.

### Próximo

- S5 Bloco 6 — frontend orçamentos (operacional + public + ficha)

---

## 2026-08-13 — S5 Bloco 4: decisão atômica + público + menor

### Feito

- `POST /quotes/:id/decision` com `Idempotency-Key` obrigatório (`quotes.write`; recepção presencial ok)
- Aprovação total/parcial na mesma TX: plano + receivable + parcelas via `billing_public`; stub throw faz rollback
- Público `GET|POST /api/v1/public/quotes/:token[/decision]` (rate 30/h); menor/`legal_guardian` + `guardianCpf`; token one-shot com replay da mesma chave
- Rejeição com motivo ≥10 sem plano; `GET /quotes/:id` devolve `receivable`
- Smoke `pnpm test:quotes-decision` + passo no `ci.yml`; docs/08 §2.6 Bloco 4

### Validação

- `typecheck` · `arch:check` a executar no gate. Smoke precisa do Postgres em `:5432`.

### Próximo

- S5 Bloco 5 — plano, execute, odontograma, produção, cancel

---

## 2026-08-13 — S5 Bloco 3: send, PDF, token, expire, duplicate

### Feito

- `POST /quotes/:id/send` (DRAFT→SENT, token `QUOTE` reutilizado, fallback WA→e-mail→COPY)
- Outbox `treatments.quote_sent` → job `generate-quote-pdf` (pdfkit, sem diagnóstico) + WA se canal WHATSAPP
- `GET /quotes/:id/pdf` URL 15 min; `409 PDF_PENDING` até o job; template `quote_sent`
- `POST /quotes/:id/duplicate` com preços atuais + `duplicated_from_id`
- Job `expire-quotes` (cron worker por TZ) SENT vencido → EXPIRED; send em expirado 409
- Smoke `pnpm test:quotes-send` + passo no `ci.yml`; docs/08 §2.6

### Validação

- `typecheck` · `arch:check` OK. Smoke `test:quotes-send` precisa do Postgres em `:5432`.

### Próximo

- S5 Bloco 4 — decisão atômica + público + menor

---

## 2026-08-13 — S5 Bloco 2: CRUD orçamento (DRAFT)

### Feito

- HTTP `GET|POST|PATCH /quotes` + `POST|DELETE /quotes/:id/items` (`quotes.read` / `quotes.write`)
- Totais no servidor; `unit_price_cents` congelado no create/add item; PATCH de catálogo não altera item
- `requiresTooth` / `requiresFace` → 422; teto de desconto por papel → `422 DISCOUNT_LIMIT_EXCEEDED`; PATCH fora de DRAFT → `409 INVALID_STATE_TRANSITION`
- Create via Action + UoW + outbox `treatments.quote_created`; número por tenant
- Smoke `pnpm test:quotes-crud` + script no `ci.yml`; docs/08 §2.6 contrato do CRUD

### Validação

- `pnpm --filter @repo/backend typecheck` · `arch:check` OK. `test:quotes-crud` precisa do Postgres em `:5432` (Docker Desktop off neste gate).

### Próximo

- S5 Bloco 3 — send, PDF, token, expire, duplicate

---

## 2026-08-13 — S5 Bloco 1: fundação treatments + fatia billing

### Feito

- Migração `20260815000000_s5_treatments_billing`: quote/plan/item + counter por tenant, fatia `financial_category`/`receivable`/`installment`/`production_entry`, RLS, purpose `QUOTE`, `appointment.treatment_item_id`
- Módulos `treatments/` + `billing/` + `*_public.ts` (`listQuotesForTimeline`, `createReceivableFromApprovedQuote`, `createProductionEntry`)
- `splitInstallments` (bigint, resíduo na 1ª parcela) + `pnpm test:split-installments` (casos + 100 pares)
- Seed categoria “Procedimentos” no signup e `db:seed`
- docs/07 §6 e docs/08 §2.6 / público quotes; `test:rls` cobre quote/receivable + port de título

### Validação

- `pnpm test:split-installments` · `pnpm db:migrate` · `pnpm test:rls` · `arch:check` · typecheck — a executar no gate

### Próximo

- S5 Bloco 2 — CRUD orçamento (preço, dente, desconto, máquina DRAFT)

---

## 2026-08-13 — S5 planejada (checklist)

### Feito

- Checklist [`sprints/S5-orcamentos-tratamentos.md`](./sprints/S5-orcamentos-tratamentos.md) no mesmo nível da S4
- Escopo: E6 Must (orçamento + PDF/envio + aprovação parcial atômica + plano + execução no atendimento)
- 7 blocos (5 backend + 2 frontend); cortes fechados (sem E7/caixa; execute via `treatments` + `*_public`; parcelas na decisão; `PlanPlaceholder` some no Bloco 7)
- README desenvolvimento aponta S5 como fase atual

### Não feito (propositadamente)

- Nenhuma implementação de código E6 — aguarda início do Bloco 1

### Próximo

- S5 Bloco 1 (DDL/RLS + `splitInstallments` + `billing_public` stub)
- Carry-over: plugar smokes S4 no CI se ainda faltarem; M3 uso real continua separado

---

## 2026-08-13 — Odontograma permanente = referência vetorizada

### Feito

- Arte FDI 1024×434 na tela (`/odontogram/reference-fdi.png`) + overlay de 32 dentes / 6 faces
- Script `scripts/odontogram/vectorize_reference.py` (OpenCV detecta dentes + VTracer)
- Decídua permanece nos glifos SVG desenhados
- Doc `docs/frontend/odontograma.md` atualizada

### Validação

- `pnpm --filter @repo/frontend typecheck` OK

### Próximo

- Conferir visual no atendimento (permanente = referência; faces pintam no overlay)

---


## 2026-08-13 — Odontograma SVG próprio (FDI + faces)

### Feito

- Silhuetas incisivo/canino/pré-molar/molar + 6 faces clicáveis (`M|D|V|L|O|C`) no dente
- Espelho por quadrante FDI (mesial → linha média; inferior vira V/C para o mento)
- Clique na face abre FormDialog com face pré-selecionada; número/silhueta = dente inteiro
- Doc: `docs/frontend/odontograma.md` (índice, 09 §4.2, módulo 05)

### Validação

- `pnpm --filter @repo/frontend typecheck` OK
- ESLint odontograma SVG OK

### Próximo

- Aceite S4 visual no atendimento (dentista seed)

---

## 2026-08-13 — S4 Bloco 7: frontend atendimento (`clinico`)

### Feito

- Rota `/app/atendimento/[appointmentId]` — 3 áreas (alertas + odontograma | plano S5 + evolução | histórico/anexos)
- CRITICAL no topo (não dispensáveis); WARNING visíveis; anamnese stale
- Odontograma FDI permanente/decídua, faces, histórico, teclado/foco; conflito com justificativa
- Evolução: templates locais, rascunho `localStorage`, assinar (`clinical_records.write`), banner imutável, amend FormDialog
- Anexos: presign → PUT storage → confirm; grid + download URL assinada; exclusão com motivo; comparação PHOTO_* lado a lado
- Agenda: “Iniciar atendimento” (`SCHEDULED`/`CONFIRMED` + `clinical_records.read`) → `IN_SERVICE` + navegação; ASB sem botão assinar
- E2E `e2e/attendance.spec.ts` (dentista seed + recepção UI oculta / 403)

### Validação

- `pnpm --filter @repo/frontend typecheck` OK
- ESLint `clinico` + `AppointmentDetailsDialog` + rota atendimento OK

### Próximo

- Aceite S4 (E2E anamnese + atendimento local) · Marco M3 uso real separado

---

## 2026-08-13 — S4 Bloco 6: frontend anamnese (public + admin + ficha)

### Feito

- Público `/anamnese/[token]` (`public`): mobile-first sem AppShell; skeleton / 404 unificado / 429; perguntas tipadas; sucesso
- Admin `/app/configuracoes/anamnese`: versões somente leitura + FormDialog nova versão (`settings.write`); nav Configurações
- Ficha (`operacional`): tab **Prontuário** com `Can clinical_records.read`; resumo/alertas + send-link (COPY/WA/e-mail) + histórico por versão
- `shared/auth/Can` + `hasPermission` (docs/09)
- E2E `e2e/anamnesis.spec.ts` (token inválido, owner ponta a ponta, recepção sem aba, admin lista v1)

### Validação

- `pnpm --filter @repo/frontend typecheck` — ok
- ESLint dos arquivos novos (anamnese public/admin/ficha) — ok
- E2E `e2e/anamnesis.spec.ts` — spec criada; não executada aqui (precisa API + seed)

### Próximo

- S4 Bloco 7 — frontend atendimento (`clinico`) + agenda “Iniciar atendimento”

---

## 2026-08-13 — S4 Bloco 5: anexos + storage

### Feito

- Port `ObjectStorage` (`shared/storage/`): MinIO/S3 + fake in-memory (`NODE_ENV=test` / `STORAGE_FAKE=1`)
- `POST .../attachments/presign` valida MIME/size/cota **antes** da URL (415 / 422 / 402 / 503)
- Confirm + checksum; download 15 min + `audit_log.patient_id`; exclusão lógica (`reason` ≥10)
- ASB anexa com `clinical_records.read`; DELETE exige `.write`; cross-tenant download → 404
- Outbox `clinical_records.attachment_created` → job `generate-attachment-thumbnail` (original intacto)
- Smoke `test:attachments`; `docs/08` §2.5 + §3.6; `test:rls` inclui `attachment`

### Validação

- typecheck / lint / arch:check / smoke — a executar no gate

### Próximo

- S4 Bloco 6 — frontend anamnese (public + admin + ficha)

---

## 2026-08-13 — S4 Bloco 4: evolução append-only

### Feito

- Domain `ClinicalNote.create` / `amend` (CRO, `content` ≥10, motivo amend ≥10, hash SHA-256)
- `GET|POST /patients/:id/record/notes` + `POST .../notes/:id/amend`; `PATCH`/`DELETE` → `423 RECORD_IMMUTABLE`
- Envelope AES-256-GCM em `content`; `content_hash` plaintext; trigger PG recusa UPDATE/DELETE
- Outbox emit-only `clinical_records.note_created` / `note_amended`; `SCHEDULED|CONFIRMED` + note → `IN_SERVICE` + `scheduling.appointment_started`
- OWNER/DENTIST sem CRO → `422`; ASB lê / não assina (`403`); recepção `403`
- Smoke `test:clinical-notes`; `docs/08` §2.5 + §3.3 atualizados (side-effects E6 ficam na S5)

### Validação

- typecheck / lint / arch:check / smoke — a executar no gate

### Próximo

- S4 Bloco 5 — anexos + storage (presign / confirm / download / delete lógico)

---

## 2026-08-13 — S4 planejada (checklist)

### Feito

- Checklist [`sprints/S4-prontuario.md`](./sprints/S4-prontuario.md) no mesmo nível da S3
- Escopo: E5 Must (anamnese + alertas + odontograma + evolução append-only + anexos + tela atendimento)
- 7 blocos (5 backend + 2 frontend); cortes fechados (sem E6/plano; envelope obrigatório; ASB anexa com `read`; M3 uso real separado)
- README desenvolvimento aponta S4 como próxima

### Próximo

- Fechar aceite S3 (E2E fake) se ainda pendente · iniciar S4 Bloco 1 (DDL/RLS/crypto/MedicalRecord)

---

## 2026-08-13 — S3 Bloco 6: frontend waitlist + WhatsApp ops

### Feito

- Agenda (`operacional`): painel Fila de espera + FormDialog criar/remover + oferta manual opcional
- Badge `REQUESTED` (cinza tracejado / Solicitado) vs `SCHEDULED`/`CONFIRMED` na grade e na legenda
- Remarcação PENDING: sem endpoint `/messaging/conversations*` (S7) — não inventado
- Package `messaging`: wizard Form `/app/whatsapp` (conectar → test → CONNECTED/ERROR + `lastError`)
- Kill switch, usage (cortesia/consumo/saldo) e logs mínimos (template/resultado/horário)
- Onboarding passo WHATSAPP → `/app/whatsapp` (pulável); link público absoluto `/agendar/{slug}`
- E2E `e2e/waitlist.spec.ts` + `e2e/messaging.spec.ts` (fake; sem Meta)

### Validação

- `pnpm --filter @repo/frontend typecheck` — ok
- ESLint dos arquivos novos (waitlist + messaging + agenda/onboarding/nav/whatsapp) — ok
- `pnpm --filter @repo/frontend lint` (repo inteiro) — falha pré-existente fora deste bloco
- E2E `e2e/waitlist.spec.ts` + `e2e/messaging.spec.ts` — specs criadas; não executadas aqui (precisa API + fake WA)

### Próximo

- Sprint 3 aceite E2E local (public-booking + waitlist + messaging) · Marco M2 número real separado

---

## 2026-08-13 — S3 Bloco 5: frontend public booking (`public`)

### Feito

- Rotas `(public)/agendar/[slug]`, `/agendar/[slug]/confirmar/[token]`, `/fila/[token]` (sem AppShell)
- Package `public`: Booking / BookingConfirm / WaitlistAccept — Page → Component → Hook (TanStack) → Service → Data
- Wizard mobile-first (serviço → profissional se >1 → data/hora → identidade+consents → OTP → sucesso)
- Estados: skeleton, slug 404, sem slots, `409 SLOT_UNAVAILABLE` + recarregar, `429`, OTP inválido/expirado
- Confirmação por link e aceite de fila por token
- E2E `e2e/public-booking.spec.ts` (slug seed via login API; OTP `debugOtp` ou Mailpit)

### Validação

- `pnpm --filter @repo/frontend typecheck` — ok
- ESLint dos arquivos novos (`packages/public` Booking/Confirm/Waitlist + rotas) — ok
- `pnpm --filter @repo/frontend lint` (repo inteiro) — falha pré-existente (operacional unused import + `shared/ui/chart.tsx`), fora deste bloco
- E2E `e2e/public-booking.spec.ts` — spec criada; não executada aqui (precisa API + Mailpit)

### Próximo

- S3 Bloco 6 — frontend waitlist (operacional) + WhatsApp ops (messaging)

---

## 2026-08-13 — S3 Bloco 4: messaging E8a (WhatsApp)

### Feito

- Módulo `messaging/` + `messaging_public.ts` (leitura de account + seed signup + schedule notifications)
- Port `MessagingProvider`: Fake (test/dev) + WhatsApp Cloud (production); token WABA no KMS (`sealSecret`)
- Account connect/test/disconnect + kill switch (`PATCH /messaging/account`); templates globais agenda; automations D-1/H-3/WAITLIST_OFFER
- Quiet hours 21–08 reagendam; create/move agenda jobs; cancel/move remove jobIds `${appointmentId}:{KEY}`
- Webhook HMAC raw body → `process-whatsapp-webhook` (`jobId=wamid`); CONFIRM/CANCEL/WAITLIST/REBOOK; débito no delivery
- Marketing `BLOCKED_NO_CONSENT`; cortesia 50; agenda nunca consome crédito
- Smoke `test:messaging` (fake + wamid duplicado + confirm → CONFIRMED) + CI + docs/07–08

### Validação

- `pnpm db:migrate` — ok
- `pnpm --filter @repo/backend exec tsc --noEmit` — ok
- `pnpm arch:check` — ok
- `pnpm test:kms` / `test:rls` — ok
- `pnpm test:messaging` — ok (3 sends + confirm → CONFIRMED + wamid duplicado = 1 inbound)

### Próximo

- S3 Bloco 5 — frontend public booking

---

## 2026-08-13 — S3 Bloco 3: fila de espera (E4b)

### Feito

- DDL `waitlist_entry` + RLS; CRUD autenticado `GET|POST|DELETE /waitlist` (`agenda.write`)
- `POST /waitlist/:id/offer` (`appointmentId` cancelado/NO_SHOW, token 30 min, `Idempotency-Key`)
- `POST /public/waitlist/:token/accept` first-accept-wins (EXCLUDE); origin `WAITLIST`
- Job `offer-waitlist-slot` via outbox em cancel/NO_SHOW; lote 3, máx. 3 lotes, delay 30 min
- Outbox `waitlist_offer_sent` com `template=waitlist_offer` + `buttonPayload=WAITLIST_<offerId>` (envio WA no Bloco 4)
- `scheduling_public.applyWaitlistAccept` / `applyWaitlistAcceptByOfferId` para messaging
- Smoke `test:waitlist` (2 aceites concorrentes → 1 appointment) + CI + docs/08

### Validação

- `pnpm db:migrate` — ok
- `pnpm --filter @repo/backend typecheck` — ok
- `pnpm arch:check` — ok
- `pnpm test:rls` — ok
- `pnpm test:waitlist` — ok (2 aceites concorrentes → 1×200 + 1×409)

### Próximo

- S3 Bloco 4 — messaging E8a

---

## 2026-08-13 — S3 Bloco 2: autoagendamento público (E4b)

### Feito

- DDL `public_booking_token` + RLS, `procedure.publicly_bookable`, `tenant.booking_settings`, `patient.origin`
- Middleware `publicTenantContext` (slug → tenant; 404) + rate limits públicos
- `GET /public/clinics/:slug` + availability (reusa S2 + lead min/max + só `publicly_bookable`)
- `POST bookings` / `verify` (OTP 6 dígitos, 5 min, 3 tentativas, e-mail; sem WABA neste bloco)
- `GET /public/appointments/:token/confirm` (`SCHEDULED→CONFIRMED`, idempotente; `REQUESTED` recusa)
- `patients_public.findOrCreateFromPublicBooking` + consents `PUBLIC_BOOKING`; origin `PUBLIC_BOOKING`
- Outbox `scheduling.appointment_scheduled|_confirmed` + stub de job; docs/07 e docs/08 alinhados
- Smoke `test:public-booking` + CI

### Validação

- `pnpm db:migrate` — ok
- `pnpm --filter @repo/backend typecheck` — ok (`tsc --noEmit`; `prisma generate` pode falhar com EPERM no Windows se o query engine estiver lockado)
- `pnpm arch:check` — ok
- `pnpm test:rls` — ok
- `pnpm test:public-booking` — ok

### Próximo

- S3 Bloco 3 — fila de espera

---

## 2026-08-13 — S3 Bloco 1: filas, outbox e worker

### Feito

- Prisma `outbox_event` + RLS (`tenant_isolation` + policy `outbox_dispatch_select`) e `TenantPrisma.runOutboxDispatch`
- `UnitOfWork` grava eventos na mesma transação; `OutboxDispatcher` a cada 5s (jobId = event.id); Redis down deixa pendente sem incrementar `attempts`
- `shared/queue/`: nomes docs/11, payload Zod (`tenantId`+`requestId`), port, BullMQ+DLQ, fake in-memory
- `worker.ts` real + `pnpm dev:worker` (raiz e `@repo/backend`); health opcional `:3334`
- Smoke `test:outbox` (fake drain + API `/health` sem Redis) + `test:rls` cobre outbox; CI integration inclui o smoke

### Validação

- `pnpm db:migrate`
- `pnpm --filter @repo/backend typecheck`
- `pnpm arch:check`
- `pnpm test:rls`
- `pnpm test:outbox`

### Próximo

- S3 Bloco 2 — autoagendamento público (E4b)

---

## 2026-08-13 — S3 planejada: detalhamento técnico do canal do paciente

### Feito

- `docs/desenvolvimento/sprints/S3-canal-paciente.md` expandido: herança S2, cortes fechados (OTP no Postgres, `REQUESTED` default, `PUBLIC_BOOKING`, créditos mínimos, waitlist 30 min/3 lotes), DDL delta, jobs/outbox, payloads HTTP (incl. `POST /public/waitlist/:token/accept`), RLS público, pastas, UX (StepNavigator / FormDialog / wizard WA), qualidade + M2 vs código Must

### Validação

- Cruzado com RF E4b/E8a, módulos 04/08, docs/07–09/11/16, ADR-0005/0006, Prisma/código S2

### Próximo

- Implementar S3 pelo Bloco 1 (filas/outbox/worker)

---

## 2026-08-13 — Playwright E2E: base + specs S1/S2

### Feito

- `@playwright/test` na raiz; `playwright.config.ts` (webServer API `:3333` + web `:3001`)
- Scripts: `pnpm test:e2e` / `test:e2e:ui` / `test:e2e:headed`
- Specs por módulo já entregue: `e2e/identity.spec.ts` (E1), `clinic.spec.ts` (E2), `patients.spec.ts` (E3), `agenda.spec.ts` (E4a)
- Login UI: Identity testa o fluxo; clinic/patients/agenda reutilizam 1 contexto por worker (`e2e/helpers/fixtures.ts`) — access token em memória + refresh cookie rotaciona (storageState por teste invalida o token)
- Rate limit login (5/e-mail/60s): workers=1; specs autenticados não relogam a cada teste

### Validação

- `pnpm test:e2e` — 19 passed (identity, clinic, patients, agenda)

### Próximo

- Sprint 3; incluir job e2e no CI quando o ambiente de Actions tiver browsers + secrets JWT

---

## 2026-08-13 — Sprint 2: fechamento Must E3/E4a + visão por cadeira

### Feito

- `GET /appointments?chairId=` no backend (schema + list repository/service); docs/08 atualizado
- Agenda (`operacional`): toggle Profissional | Cadeira; listagem, create (cadeira opcional / pré-preenchida), bloqueio e série com `chairId`
- Smoke `test:scheduling`: create + list por cadeira + bloqueio por cadeira
- Checklist S2 + README de desenvolvimento: S2 **fechada**; próximo = S3

### Validação

- `pnpm --filter @repo/frontend typecheck`
- `pnpm --filter @repo/backend exec tsc --noEmit` (se aplicável)
- `pnpm test:scheduling`

### Não fecha S2 Must (explícito)

- M1 com recepcionista real (docs/13)
- Recrutamento de clínica-piloto (roadmap §5)
- Playwright E2E (smoke HTTP no lugar)

### Próximo

- Sprint 3 — canal do paciente

---

## 2026-08-13 — Seed de tenant demo + módulos

### Feito
- `backend/prisma/seed.ts` idempotente: tenant Clínica Teste (`owner@teste.local` / `SenhaForte!99`) + clínica, horários, cadeiras, profissionais, procedimentos, equipe, convite, pacientes/consentimentos e agenda
- README: credenciais de login de desenvolvimento

### Validação
- `pnpm db:seed`

### Próximo
- Visualizar telas no frontend com os dados seedados

---

## 2026-08-13 — DX compile: sem motion no Index/Form + ban barrel UI

### Feito

- Removidos `FadeIn`/`Stagger`/`MotionTable`/`MotionProvider` do caminho crítico (Index, Form, tabelas, shell)
- Motion só em `*FormDialog` (`MotionDialogBody`, chunk `next/dynamic`)
- ESLint `no-restricted-imports` + rules: proibido `@/shared/ui`, `@/shared/ui/index`, `@/shared/ui/sidebar`
- README: exclusão do Defender na pasta do repo

### Validação

- `pnpm --filter @repo/frontend typecheck`

### Próximo

- Polish M1 / S3

---

## 2026-08-13 — Frontend: compile dev + navegação (Turbopack)

### Feito

- `(app)/layout` virou RSC; `MotionProvider` + `TooltipProvider` só no `AppShell` autenticado
- Removido `PageTransition` (`AnimatePresence mode="wait"`); `FadeIn` permanece nas páginas; `prefetch={false}` na nav; `loading.tsx` em `(app)/app`
- `optimizePackageImports` ampliado; combobox via `@base-ui/react/combobox`; `framer-motion` direto removido (`motion` permanece)
- `sidebar.tsx` fatiado (`sidebar-context` / `sidebar-chrome` / `sidebar-panel` / `sidebar-menu`); header sem popover de notificações placeholder; clinic query não bloqueia children
- `next/dynamic` nos FormDialogs de Agenda, Pacientes, Chair, Procedure, Professional, Member

### Baseline (antes, terminal `pnpm dev:web`)

| Rota | Compile frio | GET frio | GET quente |
|---|---|---|---|
| `/login` | 3.3s | 4.5s | ~0.9s |
| `/app` | 25.3s | 26.4s | 2.0s |
| `/app/onboarding` | 12.9s | 15.1s | 2.6s |
| `/app/pacientes` | 16.5s | 18.1s | 0.25s |
| `/app/agenda` | 3.0s | 3.3s | 0.33s |
| config clínicas (média) | 1.0–1.8s | 1.3–2.3s | 0.3–0.6s |

### Depois (`.next` limpo, Turbopack)

| Rota | Compile frio | GET frio | GET quente |
|---|---|---|---|
| `/login` | 7.6s* | 10.6s | **394ms** |
| `/app` | **4.4s** (era 25.3s) | 6.2s | **291ms** |
| `/app/onboarding` | **1.4s** (era 12.9s) | 1.8s | 435ms |
| `/app/pacientes` | **2.2s** (era 16.5s) | 3.0s | 396ms |
| `/app/agenda` | 2.7s | 3.1s | 402ms |
| config clínicas | 1.1–1.6s | 1.4–1.9s | 380–472ms |

\* `/login` frio agora absorve font/CSS do root (antes pagos em `/` 6.5s + login 3.3s). Quente < 500ms. `/app` e onboarding/pacientes batem as metas de compile.

### Validação

- `pnpm --filter @repo/frontend typecheck` → OK
- Re-medida após restart com `frontend/.next` limpo

### Próximo

- Polish M1 / S3 canal paciente

---

## 2026-08-12 — Sprint 2 Bloco 5: frontend agenda (`operacional`, Notion)

### Feito

- Design via **ui-ux-pro-max** + tokens Notion já no `globals.css`: grade densa, bordas `#E9E9E7`, status pastel com rótulo (a11y), motion 150–200ms, sem sombra pesada
- `/app/agenda` — Dia/Semana, slots 10/15/20/30/60, filtro profissional
- Criar em ≤3 interações (slot → paciente → Agendar); série WEEKLY/MONTHLY
- Drag/resize otimista + rollback em `409`; detalhes: status, cancelar, escopo série
- Bloqueio com alerta de conflitos; nav Agenda

### Validação

- `pnpm --filter @repo/frontend exec tsc --noEmit` → OK

### Próximo

- Polish M1 / S3 canal paciente; visão por cadeira quando a API filtrar `chairId`

---

## 2026-08-12 — Sprint 2 Bloco 4: frontend pacientes (`operacional`)

### Feito

- Package `frontend/src/packages/operacional/` — Patient (types/enum/schema/data/service/hooks/components)
- Rotas `/app/pacientes` (Index + busca + FormDialog) e `/app/pacientes/[id]` (ficha: dados, guardians, consents, timeline)
- Check-duplicate UX: CPF bloqueia create; telefone só avisa
- Nav: item Pacientes; `apiClient.requestEnvelope` para lista com `meta.nextCursor`

### Validação

- `pnpm --filter @repo/frontend exec tsc --noEmit` → OK

### Próximo

- S2 Bloco 5: frontend agenda (`operacional`)

---

## 2026-08-12 — Sprint 2 Bloco 3: bloqueios, recorrência, timeline

### Feito

- `POST|DELETE /schedule-blocks` — bloqueio por unidade/profissional/cadeira; retorna `conflicts` sem cancelar (RF-E4-08..09)
- `POST|DELETE /appointment-series` — RRULE `DAILY|WEEKLY|MONTHLY`, máx. 12 ocorrências; delete `?scope=THIS|FUTURE|ALL` (+ `appointmentId` para THIS/FUTURE)
- `GET /patients/:id/timeline` — itens de agenda via `scheduling_public`; fontes CLINICAL/QUOTE/PAYMENT/MESSAGE tipadas vazias conforme permissão (RF-E3-09/10)
- Smoke scheduling estendido (block, series, timeline)

### Validação

- `tsc` · `arch:check` · `test:scheduling` → **smoke-scheduling OK**

### Próximo

- S2 Bloco 4: frontend pacientes (`operacional`)

---

## 2026-08-12 — Sprint 2 Bloco 2: scheduling core (E4a)

### Feito

- Migração `20260812190000_s2_scheduling`: `appointment` (EXCLUDE gist profissional/cadeira), `appointment_history`, `schedule_block`, `appointment_series` + RLS + GRANT
- Módulo `backend/src/modules/scheduling/`: CRUD, status machine, history, `GET /availability` via `clinic.getWorkingWindows`, `Idempotency-Key`, `409 SLOT_UNAVAILABLE` + sugestões
- `scheduling_public.ts` (`listFutureAppointmentIds`, `getAppointmentById`); patients deixa de stubar futuros
- Exceção de horário (`clinic`) passa a retornar conflitos reais de `appointment`
- Smoke `pnpm test:scheduling` (20 concorrentes → 1 sucesso) + passo no CI
- docs/07: `appointment_series` + FK `recurrence_id`

### Validação

- `db:migrate` · `tsc` · `arch:check` · `test:scheduling` → **smoke-scheduling OK**

### Próximo

- S2 Bloco 3: bloqueios HTTP, recorrência com escopo, timeline parcial

---

## 2026-08-12 — Sprint 2 Bloco 1: patients (E3 Must backend)

### Feito

- Migrações `20260812180000_s2_patients` + `…_grants`: `patient`, `patient_code_counter`, `legal_guardian`, `consent` + RLS + GRANT `app_user`
- Módulo `backend/src/modules/patients/`: CRUD, busca (unaccent/telefone/código/CPF), check-duplicate, guardians, consents grant/revoke, soft-delete
- Nº de ficha sequencial por tenant (`patient_code_counter`); CPF único por tenant; telefone só aviso
- `patients_public.ts` (`getPatientById`, `hasMarketingConsent`); futuro appointments stub até Bloco 2
- Smoke `pnpm test:patients` + passo no CI Integration
- docs/07: `code` por tenant (não IDENTITY global)

### Validação

- `db:migrate` · `tsc` · `arch:check` · `test:patients` → **smoke-patients OK**

### Próximo

- S2 Bloco 2: scheduling core (appointment + EXCLUDE + availability)

---

## 2026-08-12 — Sprint 2 Bloco 0: horários (carry-over S1)

### Feito

- Migração `20260812160000_s2_weekday_iso`: CHECK weekday **1–7 ISO**; docs/07 e comentário Prisma alinhados
- `POST .../business-hours/exceptions` retorna `conflicts: []` (lista real no Bloco 2 com `appointment`)
- Admin UI: grade semanal com escopo unidade **ou** profissional; formulário de exceções + alerta de conflitos
- Smoke clinic: asserts `conflicts` array + weekday 7 (domingo)

### Validação

- Lint IDE nos arquivos tocados ok
- `db:migrate` / `test:clinic` / typecheck — rodar com Postgres no ar

### Próximo

- S2 Bloco 1: patients DDL + API

---

## 2026-08-12 — Planejamento Sprint 2 e Sprint 3

### Feito

- Checklist [`sprints/S2-pacientes-agenda.md`](./sprints/S2-pacientes-agenda.md) — E3 + E4a, Blocos 0–5, M1, carry-over S1
- Checklist [`sprints/S3-canal-paciente.md`](./sprints/S3-canal-paciente.md) — E4b + E8a, Blocos 1–6, M2, riscos WABA
- README de desenvolvimento atualizado (fase = S2 planejada)

### Não feito (propositadamente)

- Nenhuma implementação de código — aguarda início do Bloco 0/1 da S2

### Próximo

- S2 Bloco 0 (UI exceções / horário profissional) ou Bloco 1 (patients DDL + API)
- Em paralelo: iniciar onboarding WABA/templates Meta (R1 → M2)

---

## 2026-08-12 — Sprint 1: fechamento Must E1/E2 + Qualidade

### Feito

- `getWorkingWindows` em `clinic_public` (unidade ∩ profissional ∩ exceções; TZ do tenant)
- `PATCH /clinic/units/:id/chairs/:chairId` + UI admin (editar/inativar)
- CI Integration: `test:identity` + `test:clinic` (JWT efêmero + env de smoke)
- Checklist S1 atualizado; carry-over S2 documentado (UI exceções/horário profissional; conflitos reais)

### Validação

- `typecheck` · `arch:check` · `test:clinic` ok

### Próximo

- Sprint 2 (pacientes + agenda), começando com o carry-over de horários na UI se necessário

---

## 2026-08-12 — Sprint 1 Bloco 3: clínica E2 Must (backend)

### Feito

- Migração `20260812140000_s1_clinic_block3`: `tenant.accepted_payment_methods`, `tenant.onboarding`
- Módulo `clinic` completo: perfil, units/chairs, business-hours + exceptions, professionals, procedures, import-catalog, onboarding wizard
- Catálogo padrão centralizado em `procedure_catalog.helper.ts` (reutilizado no signup seed e import-catalog)
- Rotas registradas em `buildClinicRouter()` (`/clinic`, `/procedures`)
- Script `pnpm test:clinic` (`smoke-clinic.ts`)

### Validação

- `typecheck` · `arch:check` · `db:migrate` · `test:clinic` ok

### Próximo

- Bloco 4 (frontend): UI mínima signup/login/clínica/wizard

---

### Feito

- Convite create / list / resend / revoke / accept (7 dias, token de uso único); e-mail via Mailpit (SMTP) em local e Resend em production (ADR-0009)
- `GET /auth/me`, `POST /auth/switch-tenant`, `X-Tenant-Id` validado contra memberships (`403 TENANT_NOT_ALLOWED`)
- `GET|PATCH /users` (papel/ativo/overrides); último Owner não pode ser rebaixado nem desativado
- Reset de senha (`forgot` 202 sem enumeração; token 1h); lockout 5 falhas / 10 min progressivo + rate limit HTTP
- `audit_log`: LOGIN, LOGIN_FAILED, LOGOUT, PASSWORD_RESET, MEMBER_INVITED, ROLE_CHANGED, MEMBER_DEACTIVATED, PERMISSION_DENIED, REFRESH_REUSE_DETECTED
- Script `pnpm test:identity` (`smoke-identity.ts`): convite, me, switch, último Owner, RECEPTION → 403 em prontuário + audit

### Validação

- `typecheck` · `arch:check` · `lint` backend ok
- `db:migrate` / `test:identity` / `test:rls` exigem Postgres no ar (Docker Desktop estava parado neste ambiente)

### Próximo

- Bloco 3 (backend): clínica E2 Must (perfil, units/chairs, horários, procedimentos, profissionais, wizard)

---

## 2026-08-12 — Convenção: sprints separam Backend e Frontend

### Feito

- `docs/desenvolvimento/README.md`: toda sprint deve detalhar Backend vs Frontend (se um lado não entra, dizer explicitamente)
- `sprints/S1-identidade-clinica.md`: seção de camadas + blocos rotulados (1–3 backend, 4 frontend) + aceite separado

### Próximo

- Bloco 2 (backend): convite, RBAC/`me`, reset senha, rate limit, audit

---

## 2026-08-11 — Sprint 1 Bloco 1: identity + auth core

### Feito

- Migração `20260811200000_s1_identity_clinic`: identity/clinic DDL + RLS (membership SELECT por `app.user_id`; tenant SELECT via membership ativo)
- Módulo `identity`: signup/login/refresh/logout/logout-all (JWT RS256, Argon2id, cookie refresh rotativo)
- Seed clínica no signup via `clinic_public.seedClinicOnSignup` (unidade + horários seg–sex + catálogo procedimentos)
- Middlewares `authenticate`, `tenantContext`, `authorize`
- JWT em env como Base64(PEM); script `backend/scripts/smoke-auth.ts`

### Validação

- `pnpm db:migrate` · `typecheck` · `arch:check` · `test:rls` · `smoke-auth` (signup/login/refresh/logout/logout-all/409 duplicado) ok
- Lint backend ok após fixes

### Próximo

- Bloco 2: convite, RBAC/`me`, reset senha, rate limit, audit

---

## 2026-08-11 — Sprint 1: documentação do plano (sem código)

### Feito

- Checklist [`sprints/S1-identidade-clinica.md`](./sprints/S1-identidade-clinica.md) — blocos 1–4, RFs E1/E2, endpoints, aceite
- Atualizado [`README.md`](./README.md) (fase = S1, docs prontas)
- Escopo: Must completo E1+E2 + UI mínima (decisão 1A / 2A)

### Não feito (propositadamente)

- Nenhuma implementação de código nesta entrada — aguarda início do Bloco 1

### Próximo

- Bloco 1: migração identity/clinic + signup + login/refresh/logout

---

## 2026-08-11 — Sprint 0: ESLint real + push CI

### Feito

- `eslint.config.mjs` (flat) com `typescript-eslint` recommendedTypeChecked
- `pnpm lint` real em backend/frontend/contracts (sem stub)
- Push `main`; CI Quality falhou na 1ª tentativa (Prisma client); corrigido com `prisma generate` no typecheck/CI
- **CI verde:** [run 31531294140](https://github.com/Ioshuasl/clivra/actions/runs/31531294140) — Quality + Integration success

### Validação

- Local: `pnpm lint` / `typecheck` / `arch:check` / `test:kms` ok
- GitHub Actions: success

### Sprint 0

Checklist em [`sprints/S0-fundacao.md`](./sprints/S0-fundacao.md) **completa**.

---

## 2026-08-11 — Sprint 0: dependency-cruiser + KeyManagementPort

### Feito

- `backend/.dependency-cruiser.cjs` — regras Clean/Orius (models sem framework, Prisma só na borda, sem ciclos, cruzar módulo via `*_public.ts`)
- Scripts `pnpm arch:check` / `pnpm test:kms`; CI Quality roda ambos
- `KeyManagementPort` + `LocalKeyManagementAdapter` (AES-256-GCM wrap DEK; KEK via `KEK_LOCAL_BASE64`; fallback só em dev; production exige KEK)

### Validação

- `pnpm arch:check` → no dependency violations (24 modules)
- `pnpm test:kms` → OK wrap/unwrap + falha com KEK errada + production sem KEK
- `typecheck` backend ok

### Próximo

- ESLint real
- Confirmar CI no GitHub após push
- Dockerfiles EasyPanel

---

## 2026-08-11 — Sprint 0: CI + migração RLS

### Feito

- GitHub Actions [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml): quality (install, typecheck, lint stub, audit high+, gitleaks) + integration (Postgres, migrate, `test:rls`)
- Docker init de roles `app_migrator` / `app_user` ([`docker/postgres/init`](../../docker/postgres/init/01-roles.sql))
- Migração `20260811180000_init_rls`: `tenant`, `tenant_crypto_key`, `audit_log`, schema `platform`, helper `enable_tenant_rls`, FORCE RLS
- `TenantPrisma` (`runInTenantContext` + `runProvisioning`)
- Script `pnpm test:rls` — isolamento cross-tenant + tabelas com `tenant_id` sem RLS

### Validação local

- `prisma migrate deploy` ok
- `pnpm test:rls` → `OK: RLS isolation checks passed`
- `typecheck` backend/frontend ok
- `pnpm audit --audit-level=high` ok (overrides `postcss`/`sharp` via Next)
- Docker Desktop precisou ser iniciado; volume recriado para carregar roles do init

### Referências

- [docs/06](../06-multi-tenancy.md) · [ADR-0002](../adr/0002-multi-tenancy-rls.md)
- [S0 checklist](./sprints/S0-fundacao.md)

### Próximo

- dependency-cruiser (`arch:check`)
- ESLint real (substituir stub)
- Port `KeyManagementPort` stub
- Dockerfiles EasyPanel

---

## 2026-08-11 — Sprint 0: início do scaffold do monorepo

### Feito

- Criada pasta [`docs/desenvolvimento/`](./README.md) para diário de implementação.
- Scaffold inicial do monorepo:
  - raiz: `pnpm` workspaces, scripts, `docker-compose.yml`, `.gitignore`, `.env.example`
  - `contracts/` — tipos compartilhados (envelope API)
  - `backend/` — Express + TS, `/health` + `/api/v1/health`, env Zod, helmet/CORS, esqueleto Orius
  - `frontend/` — Next.js App Router, packages vazios, layout + login mock (`/login` → `/app`)
  - `backend/prisma/` — schema mínimo (`tenant` + `tenant_crypto_key`)

### Validação

- `pnpm install` ok
- `pnpm --filter @repo/contracts build` ok
- `typecheck` backend + frontend ok
- smoke `/health` → `{ "data": { "status": "ok", "service": "api" } }`

### Referências

- [docs/16 — Estrutura](../16-estrutura-de-pastas.md)
- [docs/13 — Roadmap S0](../13-roadmap-estimativas.md)
- [docs/05 — Arquitetura](../05-arquitetura.md)
- [Sprint S0 checklist](./sprints/S0-fundacao.md)

### Próximo

- CI GitHub Actions (lint, typecheck, audit)
- Middlewares de segurança esqueleto + dependency-cruiser
- Migração Prisma com RLS
- Login mock apontando health da API
- Port `KeyManagementPort` stub
