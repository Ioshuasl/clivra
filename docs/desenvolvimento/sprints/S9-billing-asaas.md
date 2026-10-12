# Sprint 9 — Cobrança automática da assinatura SaaS via Asaas (E10 restante)

**Objetivo verificável:** o Owner escolhe um plano, paga por **Pix, boleto ou cartão** em uma página do próprio app e a assinatura vai a `ACTIVE` sozinha, por webhook. Atraso leva a `PAST_DUE` e depois a `SUSPENDED`; cancelamento leva a `CANCELLED`. Nenhum dado de cartão toca o servidor. Evento duplicado ou fora de ordem não corrompe o estado. `BILLING_PROVIDER=manual` devolve a operação ao fluxo manual atual.

**Escopo:** RF-E10-10 e RF-E10-18 (sobem de *Could* para *Must* desta sprint) + substituição do stub `POST /subscription/checkout`. Decisão em [ADR-0017](../../adr/0017-billing-saas-asaas.md); design em [DDT — Integração Asaas](../DDT-integracao-asaas.md).
**Não entra:** NFS-e da assinatura (RF-E10-16), cupons, indicação, split, antecipação, subcontas, Pix Automático, formulário de cartão próprio, Link de Pagamento, plano anual, parcelamento.

**Pré-requisito:** S7 fechada (trial, planos, limites, guard, `subscription_update_status.action`). S8 não bloqueia, mas o `EXPORT` LGPD em `SUSPENDED` precisa continuar funcionando (já garantido pelo `subscriptionGuard`).

**Pré-requisito externo (bloqueia o Bloco 1):** conta **sandbox** do Asaas criada, chave `$aact_hmlg_...` e URL pública para o webhook (túnel). A conta de **produção** (pessoa física) só é necessária no Bloco 7.

**Estado (2026-10-13):** Blocos 1–6 implementados e **Bloco 7 homologado no sandbox real** (Pix, boleto, cartão, webhook pelo túnel, ativação, cancelamento). Pendente só o que depende de produção: conta aprovada, limites/NFS-e da conta PF, chave/token de produção e a primeira cobrança real (checklist no [runbook](../../runbooks/billing-asaas.md)).

---

## Camadas (obrigatório em toda sprint)

| Camada | Nesta sprint | Onde |
| --- | --- | --- |
| **Backend** | Sim — port + adapter Asaas, checkout, webhook, processamento, reconciliação, kill switch (Blocos 1–4) | `backend/src/modules/subscription/` + `backend/src/modules/platform/` (só reuso) |
| **Frontend** | Sim — página de checkout própria e status/cobranças da assinatura (Blocos 5–6) | `frontend/src/packages/admin/` (Subscription) |

Um bloco é **só backend** ou **só frontend**, salvo contrato (`contracts/` / `docs/08`). Cruzar BC só por `*_public.ts` + outbox. O frontend **nunca** fala com o Asaas: só com a API do app.

### Backend (Blocos 1–4)
- Port `SubscriptionBillingPort` com adapters **Asaas** e **Manual**; escolha por `BILLING_PROVIDER`.
- `POST /subscription/checkout` deixa de ser stub (hoje lança `CheckoutNotImplementedError`).
- Endpoint global `POST /api/v1/webhooks/asaas` + worker `process-asaas-event`.
- Reconciliação diária e sob demanda.
- **Não inclui** telas Next.js nem NFS-e.

### Frontend (Blocos 5–6)
- Package `admin`, entidade `Subscription` (já existe `SubscriptionIndex`/`SubscriptionBanner`): fluxo de checkout (plano → forma de pagamento → pagar) e lista de cobranças.
- **Não inclui** novos endpoints de domínio — consome os Blocos 1–4.
- **Não inclui** formulário de cartão; o cartão abre o Asaas Checkout.

---

## Estado atual do código (herança S0–S8)

Usar; **não** reimplementar.

| Já existe | Onde | Uso na S9 |
| --- | --- | --- |
| Tabelas `plan` (`price_cents`), `subscription` (`status`, `trial_ends_at`, `current_period_end`, `external_customer_id`, `external_subscription_id`, `cancel_at`), `usage_counter` | Prisma S7 | Estender; **não** recriar. `current_period_end` e os `external_*` já existem |
| `POST /subscription/checkout` (stub `CheckoutNotImplementedError`) | `subscription.routes.ts` / controller | Passa a executar o checkout real |
| `subscription_update_status.action` | `subscription/actions/subscription/` | Único caminho de mudança de status (audit + `disableAllAutomations` em read-only) |
| `subscriptionGuard`, `PlanLimitGuard`, `subscription_assert_writable` | S7 | Intactos |
| Jobs `trial_expire`, `subscription_lifecycle`, `recalculate_usage_counters` | S7 | `subscription_lifecycle` passa a considerar o vencimento da cobrança em aberto |
| Script `ops-subscription-status.ts` e `POST /subscription/ops/status` | S7 | Contingência manual (`BILLING_PROVIDER=manual`) |
| Outbox + BullMQ + DLQ, `TenantPrisma.runProvisioning` | S3 / S0 | Fila e contexto sem tenant do webhook |
| `writeAuditLog` / `AuditAction.SUBSCRIPTION_STATUS_CHANGED` | `shared/database/write_audit.ts` | Estender ações; ator `SYSTEM` |
| E-mail transacional (Resend) | ADR-0009 | Confirmação de pagamento, falha de cobrança, aviso de suspensão |
| FE: `SubscriptionIndex`, `SubscriptionBanner`, hooks `Plan*`/`Usage*`/`Subscription*` | `packages/admin` | Estender com checkout e cobranças |
| `backend/tests/` (aceite HTTP) e `pnpm tester` | S6/S7 | Novos scripts `backend/tests/subscription/` (a pasta ainda não existe) |

**Entregar nesta sprint:** DDL; port + adapters; checkout (Pix/boleto na página, cartão via Asaas Checkout); webhook idempotente; derivação de estado; reconciliação; kill switch; UI de checkout e cobranças; homologação no sandbox; checklist de go-live.

---

## Fontes

| Doc | Uso |
| --- | --- |
| [ADR-0017](../../adr/0017-billing-saas-asaas.md) | Decisão vigente |
| [DDT Asaas](../DDT-integracao-asaas.md) | Fluxos, eventos, modelo de dados, testes, go-live |
| [ADR-0010](../../adr/0010-billing-saas-manual-mvp.md) | Histórico; fluxo manual como contingência |
| [Módulo 10](../../modulos/10-billing-saas.md) | Ciclo de vida, limites, eventos, testes obrigatórios |
| [RF E10](../../requisitos/funcionais/10-billing-saas.md) | RF-E10-05..09, 10, 12, 18 |
| [S7](./S7-inbox-relatorios-billing-saas.md) | Base de subscription, guard, UI |
| [S8](./S8-endurecimento-piloto.md) | Auditoria, export em suspensão, runbooks |
| [docs/08](../../08-api-v1.md) §2.10 | Contratos; preencher no PR do bloco |
| [docs/07](../../07-modelo-de-dados.md) | Tabelas novas |
| [docs/11](../../11-infra-devops.md) | Variáveis, IPs, runbooks |
| Documentação Asaas | <https://docs.asaas.com> |

---

## Decisões de corte (fechadas no planejamento)

1. **Gateway e port.** Asaas atrás de `SubscriptionBillingPort`; adapters `AsaasBillingAdapter` e `ManualBillingAdapter`. Escolha por `BILLING_PROVIDER` (`asaas` | `manual`). O contrato do port está no DDT §5. Port em `types/ports/`; adapter em `shared/integrations/asaas/` (API externa), conforme `backend-modules`.
2. **Sem módulo novo.** Tudo em `subscription`. O endpoint de webhook entra em `subscription/routes/v1/asaas_webhook.routes.ts`, montado **fora** do stack `authenticate`/`tenantContext`/`subscriptionGuard`. Se o time preferir `platform`, **perguntar antes** (regra de módulo novo).
3. **Checkout híbrido.** Pix e boleto: assinatura pela API, exibidos no app (`pixQrCode`, linha digitável). Cartão: Asaas Checkout `RECURRENT`. Nada de formulário de cartão próprio.
4. **Preço.** O valor vem de `plan.price_cents`; o adapter converte centavos para reais (`cents / 100`, 2 casas) só na borda. O Owner não informa valor.
5. **Trial.** `nextDueDate = max(hoje, trial_ends_at)` em data local do tenant. Status só sai de `TRIAL` por pagamento confirmado. Trial vencido sem pagamento continua indo a `EXPIRED` pelo job atual; pagar depois reativa para `ACTIVE`.
6. **Estado derivado.** Status = função das cobranças (`subscription_payment`), não do evento mais recente. `OVERDUE` atrasado nunca rebaixa assinatura paga. Regras no DDT §7.2.
7. **`PAYMENT_CONFIRMED` conta como pago** (cartão: o `RECEIVED` só chega ~32 dias depois). Pix/boleto: `PAYMENT_RECEIVED`.
8. **Webhook.** Token em `asaas-access-token` (comparação em tempo constante), `INSERT ... ON CONFLICT DO NOTHING` em `asaas_event`, enfileira, responde **exatamente** `200`. `sendType: SEQUENTIALLY`. Handler não contém regra de negócio.
9. **`asaas_event` fora do RLS de tenant**, no schema `platform`, sem `tenant_id` obrigatório (o tenant é resolvido no worker via `runProvisioning`). Teste de grants no lugar do `test:rls`.
10. **Idempotência de criação.** Antes de criar customer/assinatura: procurar por `externalReference = tenantId`; lock por tenant (`pg_advisory_xact_lock`); `Idempotency-Key` obrigatória em `POST /subscription/checkout`. Timeout **não** é falha.
11. **Cancelamento.** `DELETE /subscriptions/{id}` apaga cobranças pendentes e vencidas, então só depois de confirmação explícita no app. `CANCELLED` local vem do `SUBSCRIPTION_DELETED`.
12. **Troca de cartão e mudança de valor.** Troca de cartão por novo Checkout; valor/vencimento em assinatura de cartão exigem tokenização habilitada em produção. Se não estiver habilitada, a UI orienta "cancelar e assinar de novo" ou contato — **Should** desta sprint, não Must.
13. **Upgrade/downgrade.** `PUT /subscriptions/{id}` com novo `value`, só para cobranças futuras (`updatePendingPayments` falso). Downgrade com uso acima do limite continua bloqueado no servidor (RF-E10-12). **Should**; Must é só assinar, pagar, suspender e cancelar.
14. **Reembolso e chargeback.** Só registrar e alertar a operação; **sem** mudança automática de status.
15. **Reconciliação.** Job diário + script sob demanda; lotes pequenos; respeita 25.000 req/12 h e 50 GETs concorrentes.
16. **Segredos.** `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN` só em env/secret; boot falha se o prefixo da chave (`$aact_hmlg_`/`$aact_prod_`) não bate com `ASAAS_ENV`. Nunca em log, payload armazenado ou frontend.
17. **LGPD.** CPF/CNPJ do Owner vai ao Asaas como dado necessário à cobrança; incluir na política de privacidade e no ROPA (pendência de jurídico, como na S8). Nunca logar.
18. **Conta pessoa física.** Indiferente para a API. Limites de recebimento e NFS-e são verificações do Bloco 7, não bloqueiam o código.
19. **Papéis.** Checkout, cobranças e cancelamento exigem `subscription.manage` (Owner). Demais papéis `403`, sem item de nav.
20. **Escorregar (último → primeiro a cair):** upgrade/downgrade (13) → troca de cartão (12) → reconciliação sob demanda por script → alertas Sentry finos. **Não** escorregar: webhook idempotente, derivação de estado, Pix/boleto na página, cartão via Checkout, kill switch, sandbox homologado.

---

## Fora desta sprint

- NFS-e da assinatura, cupons, indicação, plano anual, parcelamento (RF-E10-16)
- Formulário de cartão próprio e qualquer SAQ/PCI
- Link de Pagamento, Split, subcontas, antecipação, Pix Automático
- Painel interno de cobrança para operadores
- Régua de cobrança customizada além das notificações padrão do Asaas

---

## Arquitetura técnica

```
Owner (app)
  → POST /api/v1/subscription/checkout   { planCode, billingMethod }   (Idempotency-Key)
  → BillingPort ─► AsaasAdapter ─► Asaas API
        PIX/BOLETO: customer + subscription → payment → pixQrCode / boleto
        CARTÃO:     customer + checkout RECURRENT → URL do Asaas Checkout
  → grava subscription.external_*, subscription_payment, subscription_checkout

Asaas
  → POST /api/v1/webhooks/asaas  (token → INSERT asaas_event → 200)
  → fila `process-asaas-event` → resolve tenant (runProvisioning)
  → upsert subscription_payment → recalcula status → update_status.action
  → outbox: subscription.subscription_activated | payment_failed | suspended | cancelled
  → e-mail (Resend) + banner no app

Job diário `reconcile-asaas-subscriptions` ─► GET subscription/payments ─► mesma rota de estado
```

> **Como ficou:** o cliente HTTP e os tipos do Asaas estão em `shared/integrations/asaas/`; os **adapters** (`AsaasBillingAdapter`, `ManualBillingAdapter`, factory) ficam em `modules/subscription/adapters/` e implementam o port do módulo, sem vazar payload do Asaas para o domínio. `platform.asaas_link` mapeia tenant ↔ ids do Asaas: o webhook chega sem tenant e o RLS impediria a busca em `subscription`.

### Pastas-alvo (snake do repo)

```
backend/src/
  shared/integrations/asaas/
    asaas.client.ts                 # HTTP, headers, timeout 60 s, 429/5xx backoff
    asaas.types.ts                  # payloads Zod com .passthrough()
    asaas_billing.adapter.ts
  modules/subscription/
    types/ports/subscription_billing.port.ts
    adapters/manual_billing.adapter.ts
    enum/subscription/billing_method.enum.ts  # PIX | BOLETO | CREDIT_CARD
    models/…                        # SubscriptionPayment, SubscriptionCheckout
    actions/subscription/subscription_checkout.action.ts
    actions/subscription/subscription_apply_payment_event.action.ts
    repositories/payment/…          # upsert por external_payment_id
    repositories/checkout/…
    repositories/asaas_event/…      # insert on conflict, claim, mark done/failed
    routes/v1/asaas_webhook.routes.ts
    controllers/asaas_webhook.controller.ts
    jobs/process_asaas_event.job.ts
    jobs/reconcile_asaas_subscriptions.job.ts
  scripts/ops-asaas-reconcile.ts

frontend/src/packages/admin/
  components/Subscription/…Checkout* , …PaymentList*
  hooks|services|data|types|enum/Subscription/…
  app/(app)/app/assinatura/checkout/page.tsx
```

Action **somente** quando há efeito além do repositório (chamada ao Asaas, outbox, e-mail, `update_status`).

---

## DDL (migração S9) + RLS

| Tabela / alteração | Notas |
| --- | --- |
| `subscription` | `+ billing_method`, `+ billing_provider` (`ASAAS` \| `MANUAL`, default `MANUAL`). Reaproveita `current_period_end`, `external_customer_id`, `external_subscription_id` |
| `subscription_payment` | RLS tenant; `external_payment_id` **UNIQUE**; `status` (espelho), `value_cents`, `due_date`, `paid_at`, `billing_type`, `invoice_url`, `last_event_at`; índice `(tenant_id, due_date DESC)` |
| `subscription_checkout` | RLS tenant; `external_checkout_id` **UNIQUE**; `status` (`PENDING`\|`PAID`\|`CANCELED`\|`EXPIRED`), `url`, `expires_at` |
| `platform.asaas_event` | **Sem** RLS de tenant; `asaas_event_id` **UNIQUE**, `event`, `payload jsonb`, `status` (`PENDING`\|`DONE`\|`FAILED`), `attempts`, `received_at`, `processed_at`; `GRANT` só ao role do worker/API de webhook |
| `AuditAction` | `SUBSCRIPTION_CHECKOUT_CREATED`, `SUBSCRIPTION_PAYMENT_CONFIRMED`, `SUBSCRIPTION_RECONCILED` (+ reaproveita `SUBSCRIPTION_STATUS_CHANGED` com `source: ASAAS_WEBHOOK`) |

Valores em **centavos inteiros** (`bigint`). Nenhum campo guarda número de cartão, CVV ou token de cartão.

---

## Contratos HTTP (S9) — esqueleto

Envelope `{ data }` / `{ error }`; camelCase; UUID v7. Preencher `docs/08` §2.10 no PR do bloco.

```
POST   /api/v1/subscription/checkout        { planCode, billingMethod }  Idempotency-Key
       → PIX/BOLETO: { checkoutId, payment: { id, dueDate, valueCents, pix?: { qrCodeBase64, payload, expiresAt }, boleto?: { digitableLine, url } } }
       → CARTÃO:     { checkoutId, redirectUrl }
GET    /api/v1/subscription/payments         ?cursor=&limit=     # cobranças (espelho local)
GET    /api/v1/subscription/payments/:id/pay                       # QR Pix atualizado ou boleto
POST   /api/v1/subscription/cancel           { reason? }          # confirma e chama o Asaas
POST   /api/v1/webhooks/asaas                # sem auth de usuário; header asaas-access-token
```

Erros estáveis: `401 INVALID_WEBHOOK_TOKEN` (webhook), `409 SUBSCRIPTION_ALREADY_ACTIVE`, `409 IDEMPOTENCY_KEY_REUSED`, `422 PLAN_NOT_FOUND`, `422 BILLING_METHOD_NOT_SUPPORTED`, `422 CPF_CNPJ_REQUIRED`, `502 BILLING_GATEWAY_ERROR`, `503 BILLING_UNAVAILABLE` (kill switch/manual). O webhook **sempre** devolve `200` para evento válido, mesmo de tenant desconhecido.

---

## Jobs e eventos

| Job / evento | Fila | Notas |
| --- | --- | --- |
| `process-asaas-event` | `subscription` | Idempotente por `asaas_event_id`; retry exponencial; 5 falhas → DLQ + alerta |
| `reconcile-asaas-subscriptions` | `subscription` | Diário; assinaturas com cobrança intermediária antiga ou sem evento há 48 h |
| `subscription_lifecycle` (existente) | `subscription` | `PAST_DUE` → `SUSPENDED` após 7 dias da cobrança em aberto |
| `subscription.subscription_activated` / `payment_failed` / `subscription_suspended` / `subscription_cancelled` (outbox) | — | Banners e e-mails de ciclo de vida (já previstos no módulo 10) |

---

## Fluxos (domínio + UX)

### A. Assinar com Pix ou boleto
**Backend:** `ensureCustomer` → `createSubscription` → localizar a cobrança gerada → `pixQrCode` ou boleto → persistir.
**Frontend:** `/app/assinatura/checkout`: plano e preço → forma de pagamento → tela com QR Code (copiar código) ou boleto; estado "aguardando pagamento" lê **`GET /subscription`** do app (nunca o Asaas); ao virar `ACTIVE`, tela de sucesso.

### B. Assinar com cartão
**Backend:** `createCardCheckout` (`RECURRENT`, `callback.*` para rotas do app) → devolve `redirectUrl`.
**Frontend:** botão leva ao Asaas Checkout; o retorno cai em tela "confirmando pagamento" até o webhook ativar. O `successUrl` não confirma nada.

### C. Inadimplência
Webhook `PAYMENT_OVERDUE` / `CAPTURE_REFUSED` → `PAST_DUE` + banner + e-mail → 7 dias → `SUSPENDED` (somente leitura + exportação). Pagar reativa.

### D. Cancelar
Confirmação explícita → `DELETE` no Asaas → `SUBSCRIPTION_DELETED` → `CANCELLED` (login e exportação por 90 dias).

---

## Blocos de entrega

### Bloco 1 — Backend: fundação (DDL, config, port, adapters)
- [x] Migração `20261013000000_s9_billing_asaas` (colunas em `subscription`, `subscription_payment`, `subscription_checkout`, `platform.asaas_event` e `platform.asaas_link`) + RLS/grants
- [x] Env: `ASAAS_ENV`, `ASAAS_BASE_URL`, `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN`, `ASAAS_USER_AGENT`, `BILLING_PROVIDER`; validação Zod no boot (prefixo da chave × ambiente)
- [x] `asaas.client` (headers, timeout 60 s, backoff em 429/5xx, sem log de segredos)
- [x] `SubscriptionBillingPort` + `ManualBillingAdapter` + `AsaasBillingAdapter` (customers, subscriptions, checkouts, pixQrCode, payments)
- [x] Servidor Asaas **fake** em `backend/scripts/lib/asaas_fake_server.ts` + `asaas_smoke_harness.ts` (sem rede)
- [x] Smoke `test:asaas-adapter` (15 checks) + `test:rls` verde (a checagem genérica pega as tabelas novas)

### Bloco 2 — Backend: checkout e cobranças
- [x] `POST /subscription/checkout` (substitui o stub): customer idempotente, assinatura, Pix/boleto ou checkout de cartão
- [x] `GET /subscription/payments` e `GET /subscription/payments/:id/pay` (renomeado de `/pix`: devolve QR Pix **ou** boleto)
- [x] `POST /subscription/cancel`
- [x] `Idempotency-Key` (UNIQUE tenant+chave), busca por `externalReference` antes de criar customer **e** assinatura. Lock por tenant: só no processamento de eventos (advisory lock); no checkout o UNIQUE da chave + a busca bastam
- [x] Audit `SUBSCRIPTION_CHECKOUT_CREATED`; `409 SUBSCRIPTION_ALREADY_ACTIVE`
- [x] Smoke `test:subscription-checkout` (30 checks; retry após timeout não duplica)
- [x] docs/08 §2.10 e docs/07 atualizados

### Bloco 3 — Backend: webhook e processamento
- [x] `POST /webhooks/asaas`: token em tempo constante, `ON CONFLICT DO NOTHING`, enfileira, `200`
- [x] Fora do rate limit geral; sem CORS/CSRF; limite de tamanho do corpo
- [x] Worker `process-asaas-event`: resolve tenant por `runProvisioning`, upsert de `subscription_payment`, derivação de estado (decisões 6 e 7), `update_status.action` com `source: ASAAS_WEBHOOK`
- [x] Mapa de eventos do DDT §7.2 (inclui `CHECKOUT_PAID`, `SUBSCRIPTION_*`); evento desconhecido = persistir e `DONE`
- [x] Parser tolerante a campo novo (`.passthrough()`)
- [x] Outbox `subscription_activated` / `payment_failed` / `subscription_suspended` / `subscription_cancelled`
- [x] Smoke `test:asaas-webhook` (28 checks): duplicado (1 efeito, 2×`200`), fora de ordem converge, token inválido `401`, `OVERDUE` atrasado não rebaixa, tenant inexistente `200` sem vazamento

### Bloco 4 — Backend: ciclo de vida, reconciliação e contingência
- [x] `PAST_DUE` → `SUSPENDED` em 7 dias do vencimento da cobrança em aberto (job novo `suspend-past-due`; o `subscription_lifecycle` de trial ficou intacto)
- [x] Job `reconcile-asaas-subscriptions` + `scripts/ops-asaas-reconcile.ts`; audit `SUBSCRIPTION_RECONCILED`; varredor de eventos presos (a cada 5 min no worker)
- [x] Kill switch `BILLING_PROVIDER=manual` (checkout devolve `503 BILLING_UNAVAILABLE`; ops manual segue)
- [x] E-mails (best-effort, fora da transação): pagamento confirmado, falha de cobrança, suspensão, cancelamento
- [ ] Alertas: hoje só `logger.warn` (`asaas_events_stuck`, `asaas_event_enqueue_failed`, `asaas_payment_needs_review`). Integração com Sentry/alerta ativo **pendente**
- [ ] Should (não feito): upgrade/downgrade (`PUT /subscriptions/{id}`) respeitando RF-E10-12; troca de cartão
- [x] Lifecycle e reconciliação cobertos no `test:asaas-webhook` (sem scripts separados); CI atualizado (3 passos novos). `tester` (skill) não foi tocado

### Bloco 5 — Frontend: página de checkout

- [x] `/app/assinatura/checkout` (`SubscriptionCheckoutForm`): Page → Component → Hook → Service → Data (TanStack), um único CTA no resumo
- [x] Referência: tabela de preços de 3 colunas + resumo fixo à direita (padrão Stripe Checkout). Passos: plano → forma de pagamento → dados de cobrança
- [x] Pix: QR Code + copia e cola na própria página (`PaymentPixPanel`); boleto: linha digitável + link (`PaymentBoletoPanel`); cartão: redireciona ao Asaas Checkout
- [x] Estados: carregando (skeleton), aguardando (polling da assinatura a cada 4 s), confirmado, erro do servidor (mantém a escolha), pagamento online desligado, assinatura já ativa
- [x] Retorno `/app/assinatura/retorno?status=success|cancel|expired`: **não** confirma pagamento; "confirmando…" até o webhook ativar (desiste após 2 min com mensagem tranquilizadora)
- [x] CPF/CNPJ: pré-preenchido com o CNPJ da clínica; validado no cliente (11/14 dígitos) e `422 CPF_CNPJ_REQUIRED` vira erro no campo
- [x] `Idempotency-Key` gerada por escolha (plano+forma+documento): a mesma chave é reutilizada em retentativas
- [x] E2E `e2e/subscription-checkout.spec.ts` (Pix com ativação automática, cartão com retorno, erro de servidor, retorno cancelado/expirado, pagamento desligado). **Desvio:** a API de assinatura é simulada no navegador (`page.route`), não um Asaas fake no servidor — o backend/Asaas já têm os smokes `test:*`

### Bloco 6 — Frontend: status, cobranças e inadimplência

- [x] `SubscriptionIndex` reescrito: cartão do plano (preço, status com ícone, próxima cobrança, forma de pagamento, barra do teste), uso com barras, tabela de faturas
- [x] Um CTA primário no cabeçalho por estado: TRIAL → "Assinar agora"; EXPIRED/SUSPENDED/CANCELLED → "Reativar assinatura"; PAST_DUE → "Pagar fatura em aberto" (abre diálogo com Pix/boleto e fecha sozinho quando o webhook confirma); ACTIVE → nenhum
- [x] Banner global (`SubscriptionBanner`): atraso, trial ≤ 3 dias, somente leitura; CTA leva ao checkout/fatura; **some nas rotas de assinatura** (a própria tela já traz alerta e CTA)
- [x] Cancelamento com confirmação explícita (`AlertDialog`, motivo opcional) — só com recorrência no gateway e status ACTIVE/PAST_DUE
- [x] DENTIST/RECEPTION/ASB: sem nav e com aviso de permissão (spec `subscription.spec.ts` mantido)
- [x] Backend: `GET /subscription` passou a devolver `billingMethod`, `billingProvider`, `hasRecurringBilling` e `checkoutAvailable` (a UI usa para decidir CTA/cancelar e para avisar quando o pagamento online está desligado)
- [ ] Tabela de faturas é uma tabela simples de leitura (≤ 12 linhas), sem `DataTable`/`Columns` dedicados e sem paginação — suficiente para 1 fatura por mês; revisar se o volume crescer

### Bloco 7 — Homologação sandbox e go-live

- [x] Jornadas no **sandbox real** (`backend/scripts/homolog-asaas-sandbox.ts`, repetível): Pix → pagamento simulado → webhook (túnel Cloudflare) → `ACTIVE`; cancelamento; boleto; checkout de cartão criado e pago manualmente com cartão de teste → eventos ligados ao tenant, recorrência ativa no Asaas
- [x] Perguntas abertas do DDT §16 respondidas (emenda no ADR-0017): `customer` no checkout exige telefone+endereço → cartão **sem** `customer`, vínculo pelo id do checkout; URLs de retorno precisam ser públicas; cartão cobra só no fim do teste
- [x] Ajustes decorrentes: `platform.asaas_checkout_link`, evento sem tenant espera 24 h, cancelar no teste não derruba a conta, `SUBSCRIPTION_DELETED` de recorrência antiga é ignorado, erros do gateway logados (status/código/descrição)
- [x] Runbook [billing-asaas](../../runbooks/billing-asaas.md): fila pausada, rotação de chave/token, gateway fora (kill switch), divergência de status, checklist de go-live
- [ ] Confirmar com o Asaas: limites da conta PF, NFS-e, aprovação da conta de produção, tokenização
- [ ] Go-live: chave e URL de produção, webhook de produção (token novo), **uma cobrança real de baixo valor** (Pix e cartão), alertas ativos, worker rodando
- [ ] Atualizar módulo 10 §5/§8 e RF E10 (RF-E10-10/18 → Must) — pendente de revisão do texto comercial

## Endpoints-alvo (resumo)

```
POST            /api/v1/subscription/checkout
GET             /api/v1/subscription/payments
GET             /api/v1/subscription/payments/:id/pay
POST            /api/v1/subscription/cancel
POST            /api/v1/webhooks/asaas
```

**Backend — aceite de código**
- [x] Checkout Pix/boleto cria customer + assinatura uma única vez, mesmo com retry
- [x] Webhook duplicado não duplica efeito e responde `200` nas duas entregas
- [x] Eventos fora de ordem convergem para o mesmo estado
- [x] `PAYMENT_CONFIRMED` (cartão) e `PAYMENT_RECEIVED` (Pix/boleto) ativam; `OVERDUE` leva a `PAST_DUE`; `SUBSCRIPTION_DELETED` leva a `CANCELLED`
- [x] Token inválido → `401`; nada gravado
- [x] `SUSPENDED` continua somente leitura (`402 SUBSCRIPTION_REQUIRED` em escrita); exportação segue pela allowlist existente
- [x] `BILLING_PROVIDER=manual` restaura o fluxo antigo (checkout `503`; ops manual segue)
- [x] Nenhum dado de cartão em banco, log ou payload armazenado (o app nunca recebe cartão; o payload do webhook só traz 4 últimos dígitos e bandeira)
- [x] Reconciliação corrige divergência plantada

**Frontend — aceite de código**
- [x] Owner assina por Pix e vê a tela de sucesso após o webhook
- [ ] Owner vê o boleto e a linha digitável (componente pronto; sem cenário E2E dedicado)
- [x] Owner de cartão volta do Asaas e vê "confirmando" até a ativação
- [x] Banner correto em `PAST_DUE` e `SUSPENDED` (trial ≤ 3 dias coberto só por inspeção)
- [x] Recepção/dentista sem acesso à assinatura (aviso de permissão; checkout exige `subscription.manage`)

---

## Qualidade

- CI: lint, typecheck, `arch:check`, migrate, `test:rls`, smokes `asaas-adapter` / `subscription-checkout` / `asaas-webhook` / `subscription-lifecycle` / `asaas-reconcile` (todos contra o servidor **fake**)
- Domínio: derivação de estado pura e testável; eventos duplicados, atrasados e desconhecidos
- Resiliência: Asaas fora do ar → checkout `502/503`, app segue funcionando; Redis down → evento já está em `asaas_event`, reprocessa ao voltar
- Segurança: token de webhook em tempo constante; chave só em env; gitleaks sem achados; payload sem dado de cartão
- Envelope `{ data }` / `{ error }`; camelCase; UTC no banco; dinheiro em centavos
- Logs: **zero** token, API key, CPF/CNPJ, payload bruto de cartão
- Sandbox real **não** roda no CI de PR (depende de túnel e conta); roteiro manual no Bloco 7

---

## Aceite de produto

- [ ] Owner de uma clínica em trial assina pelo app por Pix e a assinatura vira `ACTIVE` sem intervenção
- [ ] Mesmo fluxo por boleto e por cartão
- [ ] Atraso gera aviso, depois suspensão somente leitura; pagamento reativa
- [ ] Cancelamento encerra a recorrência e leva a `CANCELLED`
- [ ] Operação consegue desligar o Asaas e ativar manualmente em minutos
- [ ] Uma cobrança real de baixo valor concluída em produção com a conta da plataforma
- [ ] Runbooks publicados

Pendências externas que **não** bloqueiam o aceite de código: texto de privacidade/ToS (jurídico), aprovação da conta de produção e NFS-e.

---

## Bloqueios

| Risco | Mitigação |
| --- | --- |
| Conta sandbox/túnel indisponível | Servidor fake cobre o CI; sandbox real só no Bloco 7 |
| Fila do webhook pausada (15 falhas) e eventos apagados após 14 dias | Responder `200` rápido; alerta em `asaas_event` pendente; runbook + reconciliação |
| Vínculo Checkout → tenant incerto | Passar `customer` do tenant; validar `SUBSCRIPTION_CREATED` no sandbox (pergunta 2 do DDT) |
| Conta PF sem NFS-e ou com limite de recebimento | Confirmar no Bloco 7; NFS-e fora do escopo |
| Duplicar customer/assinatura em retry | Busca por `externalReference`, lock por tenant, `Idempotency-Key` |
| Webhook de outro tenant/forjado | Token em tempo constante; tenant resolvido pelo `sub_...` armazenado; resposta `200` sem detalhes |
| Estouro de cota da API (25.000/12 h) | Webhook como fonte de verdade; reconciliação em lotes |
| `DELETE` apaga cobranças pendentes | Confirmação explícita; usar `INACTIVE` para pausa |
| Escopo cresce (upgrade, troca de cartão) | Ordem de escorrega #20 |

## Notas

- Seed e2e: tenant em trial com plano `ESSENCIAL`; servidor Asaas fake devolve QR e boleto determinísticos.
- Aceite HTTP: `backend/tests/subscription/`.
- Playwright workers=1; checkout usa **owner**; recepção só o `403`/nav oculta.
- Em dúvida de produto/DDL/contrato **não** fechada acima → **perguntar** antes de implementar (não improvisar formulário de cartão, NFS-e, nem mudança automática de status por reembolso/chargeback).
