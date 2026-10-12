# DDT — Integração de cobrança de assinaturas com o Asaas

- **Status:** Aprovado — backend (Blocos 1–4 da S9) implementado e coberto por smokes com Asaas fake; homologação no sandbox real pendente — decisão em [ADR-0017](../adr/0017-billing-saas-asaas.md), que supersede o [ADR-0010](../adr/0010-billing-saas-manual-mvp.md)
- **Data:** 2026-10-12
- **Módulo:** `subscription` (cobrança plataforma → clínica; não confundir com `billing`/financeiro da clínica)
- **Requisitos:** RF-E10-10 e RF-E10-18 (hoje *Could*) — [RF E10](../requisitos/funcionais/10-billing-saas.md)
- **Fonte:** documentação oficial do Asaas (<https://docs.asaas.com>), lida em 2026-10-12

---

> **Plano de execução:** [Sprint 9](./sprints/S9-billing-asaas.md). O endpoint `POST /subscription/checkout` já existe como stub (`CheckoutNotImplementedError`) e é substituído por este desenho.

## 1. Contexto e objetivo

A S7 entregou trial de 14 dias, planos, limites e a máquina de estados `TRIAL → ACTIVE → PAST_DUE → SUSPENDED → CANCELLED`, mas a mudança de status é **manual** (script de operação). O objetivo deste DDT é automatizar a cobrança mensal com o **Asaas**, de modo que o pagamento confirmado ative a assinatura e a inadimplência a degrade, sem intervenção humana.

A conta Asaas é da plataforma (pessoa física do responsável). Para a API isso é indiferente; a diferença aparece só na emissão de NFS-e (§12).

**Não é objetivo:** nota fiscal da assinatura (RF-E10-16), cupons, split, antecipação, subcontas, Pix Automático.

## 2. Decisões

| # | Decisão | Motivo |
|---|---|---|
| D1 | O cliente da clínica é o **Owner do tenant**; um `customer` Asaas por tenant | Cobrança é plataforma → clínica |
| D2 | Recorrência via **assinatura do Asaas** (`POST /v3/subscriptions`, `cycle: MONTHLY`), não cobranças avulsas geradas por nós | O Asaas gera cada cobrança, vencimento e notificação |
| D3 | **Checkout híbrido com página própria.** Tela de planos, resumo e sucesso são do app. **Pix/boleto** (assinatura pela API) são exibidos **dentro do app** (QR Code, copia-e-cola, linha digitável). **Cartão** vai ao **Asaas Checkout** (`chargeTypes: RECURRENT`) e volta para uma tela de sucesso do app | O app nunca toca em dado de cartão → sem PCI, e Pix/boleto ficam na marca do produto |
| D3b | **Fora do escopo:** formulário de cartão próprio e Link de Pagamento como caminho principal | Cartão pelo nosso servidor traz a infraestrutura para o escopo do PCI DSS; o Link cria o cliente sem vínculo com o tenant |
| D4 | **Webhook é a fonte de verdade**; polling só para reconciliação | Recomendação oficial e limite de 25.000 req/12 h |
| D5 | Estado da assinatura é **derivado do estado das cobranças**, não da ordem dos eventos | Eventos são *at least once* e podem chegar fora de ordem |
| D6 | Integração atrás de port `SubscriptionBillingPort`, com adapters **Asaas** e **Manual** (o atual) | ADR-0010 já exige port; mantém o fallback operacional |
| D7 | Webhook configurado como **`SEQUENTIALLY`** | A ordem `OVERDUE → CONFIRMED → RECEIVED` faz diferença; a vazão é irrelevante neste volume |
| D8 | O trial continua sendo nosso: `nextDueDate` da assinatura = fim do trial | Sem cobrança durante o trial; sem cartão no signup |

## 3. Arquitetura

```
Owner (app)
  │ POST /subscription/checkout
  ▼
SubscriptionBillingPort ──► AsaasAdapter ──► Asaas API (access_token)
  │                                              │
  │  grava subscription.external_*               │ gera cobranças (40 d antes do vencimento)
  ▼                                              ▼
Postgres  ◄── worker `process-asaas-event` ◄── POST /api/v1/webhooks/asaas
                  ▲                              (valida token → INSERT asaas_event → 200)
                  │
          job de reconciliação (diário)
```

- O endpoint de webhook é **global** (sem `X-Tenant-Id`, sem JWT, fora do `subscriptionGuard`). O tenant é resolvido pelo `sub_...`/`cus_...` guardados em `subscription`, via contexto de provisionamento (o `TenantPrisma.runProvisioning` já existe), porque o RLS bloqueia a consulta normal.
- O processamento roda no **worker** (BullMQ), nunca na requisição. Segue o padrão outbox/fila das S3+.
- A transição de status reaproveita `subscription_update_status.action`, mantendo auditoria e eventos (`subscription_activated`, `payment_failed`…).

## 4. Modelo de dados (delta)

`subscription` já tem `external_customer_id` e `external_subscription_id`. Acrescentar:

| Tabela / coluna | Notas |
|---|---|
| `subscription.billing_method` | `PIX \| BOLETO \| CREDIT_CARD \| NULL` (NULL = manual) |
| `subscription.billing_provider` | `ASAAS \| MANUAL` (default `MANUAL`) |
| `subscription.current_period_end` | **Já existe** (S7); passa a guardar o próximo vencimento conhecido (`nextDueDate`) |
| `subscription_payment` (RLS tenant) | `id`, `tenant_id`, `subscription_id`, `external_payment_id` **UNIQUE**, `status` (espelho de `payment.status`), `value_cents`, `due_date`, `paid_at`, `billing_type`, `invoice_url`, `last_event_at` |
| `subscription_checkout` (RLS tenant) | `id`, `tenant_id`, `external_checkout_id`, `status` (`PENDING\|PAID\|CANCELED\|EXPIRED`), `url`, `expires_at` |
| `platform.asaas_link` (**sem** RLS) | `tenant_id` PK, `external_customer_id` UNIQUE, `external_subscription_id` UNIQUE. O webhook chega sem tenant e o RLS impede buscar em `subscription`; é daqui que o evento descobre o tenant |
| `asaas_event` (**sem** RLS; schema `platform`) | `id`, `asaas_event_id` **UNIQUE**, `event`, `payload jsonb`, `status` (`PENDING\|DONE\|FAILED`), `attempts`, `received_at`, `processed_at` |

Regras:
- Valores monetários ficam em **centavos inteiros**; converter para reais (`value_cents / 100`, com 2 casas) só na borda do adapter.
- `asaas_event.payload` **não** pode conter dado de cartão (o Asaas só devolve os 4 últimos dígitos e a bandeira) e não vai para log.
- Todo `external_*` é gravado **antes** de responder ao usuário e é imutável, salvo troca de assinatura.

## 5. Port e adapter

```ts
interface SubscriptionBillingPort {
  ensureCustomer(tenant: TenantBillingProfile): Promise<{ customerId: string }>;
  createSubscription(input: CreateSubscriptionInput): Promise<{ subscriptionId: string }>;
  getPixQrCode(paymentId: string): Promise<{ encodedImage: string; payload: string; expirationDate: string }>;
  getPaymentInvoice(paymentId: string): Promise<{ invoiceUrl: string; bankSlipUrl?: string }>;
  createCardCheckout(input: CreateCheckoutInput): Promise<{ checkoutId: string; url: string }>;
  updateSubscription(id: string, patch: { value?: number; nextDueDate?: string; updatePendingPayments?: boolean }): Promise<void>;
  setSubscriptionActive(id: string, active: boolean, nextDueDate?: string): Promise<void>;
  cancelSubscription(id: string): Promise<void>;
  getSubscription(id: string): Promise<AsaasSubscription>;
  listSubscriptionPayments(id: string): Promise<AsaasPayment[]>;
}
```

Convenções do adapter (cliente HTTP em `shared/integrations/asaas/`; adapters em `modules/subscription/adapters/`; `arch:check` limpo). O port também expõe `findSubscriptionByReference(customerId, externalReference)` (`GET /subscriptions?customer=&externalReference=`), usado para **adotar** a assinatura criada por uma tentativa anterior que deu timeout, em vez de duplicar:
- Base URL e chave por ambiente (`ASAAS_BASE_URL`, `ASAAS_API_KEY`). Chave `$aact_hmlg_` só no sandbox e `$aact_prod_` só em produção; falhar no boot se a chave não combina com a URL.
- Headers: `access_token`, `User-Agent` (obrigatório) e `Content-Type: application/json`.
- Timeout de **60 s** em chamadas que podem processar cartão.
- Tolerar campos desconhecidos no JSON (Zod `.passthrough()`): o Asaas pode adicionar atributos sem aviso.
- Cliente HTTP com respeito a `429` (backoff) e logs sem segredos.

## 6. Fluxos

### 6.1 Assinar (Owner → `ACTIVE`)

1. `POST /api/v1/subscription/checkout { planCode, billingMethod }` (permissão do Owner; `Idempotency-Key` obrigatório).
2. `ensureCustomer`: se `external_customer_id` existe, reutiliza; senão consulta por `externalReference = tenantId` e só então cria (`POST /v3/customers` com `name`, `cpfCnpj`, `email`, `mobilePhone`, `externalReference`). O CPF/CNPJ do Owner é dado pessoal — LGPD (§11).
3. **Pix/boleto (na página do app):** `POST /v3/subscriptions` com `customer`, `billingType`, `value`, `cycle: MONTHLY`, `nextDueDate`, `description`, `externalReference = tenantId`. Guarda `sub_...`.
   - O Asaas gera a cobrança até 40 dias antes do vencimento. O app busca a cobrança com `GET /v3/subscriptions/{id}/payments` (ou pelo `PAYMENT_CREATED`) e então:
   - **Pix:** `GET /v3/payments/{id}/pixQrCode` → `encodedImage` (Base64), `payload` (copia e cola) e `expirationDate`. A tela mostra o QR Code, o botão "copiar código" e o estado "aguardando pagamento" (atualizado por polling **interno** ao nosso backend, que lê `subscription_payment`, nunca ao Asaas).
   - **Boleto:** mostra linha digitável e link do boleto (`bankSlipUrl`/`invoiceUrl` do payload).
   - O QR Code é dinâmico e de uso único; se a cobrança for alterada, buscar um novo.
4. **Cartão (Asaas Checkout):** `POST /v3/checkouts` com `billingTypes: [CREDIT_CARD]`, `chargeTypes: [RECURRENT]`, `callback` (success/cancel/expired apontando para rotas do app), `items` e `subscription { cycle, nextDueDate }`; `minutesToExpire` entre 10 e 1440. Guarda o `checkoutId` e devolve a URL. O `successUrl` **não** confirma nada: a tela de sucesso do app mostra "confirmando pagamento" até o webhook chegar.
5. A assinatura só vira `ACTIVE` quando chegar `PAYMENT_CONFIRMED`/`PAYMENT_RECEIVED` (§7.2).

**Experiência na página própria:** plano e preço do `plan`, escolha entre Pix, boleto e cartão, estados de carregando, aguardando, pago, expirado e erro, e e-mail de confirmação pelo Resend. A cobrança e o resultado vêm sempre do backend; o frontend nunca fala com o Asaas.

`nextDueDate` = `max(hoje, fim do trial)`. Se for hoje, o Asaas pode cobrar imediatamente.

### 6.2 Trocar cartão
`PUT /v3/subscriptions/{id}/creditCard` (sem cobrança imediata; atualiza as cobranças pendentes). Para evitar PCI, usar novo Checkout/token — **a validar no sandbox** (ver §14).

### 6.3 Upgrade / downgrade
`PUT /v3/subscriptions/{id}` com o novo `value`. Por padrão afeta só as cobranças **futuras**; usar `updatePendingPayments: true` se a cobrança já gerada deve refletir o novo valor. A regra de downgrade bloqueado por uso acima do limite (RF-E10-12) continua no servidor, antes da chamada. Para valor/vencimento em assinatura de cartão, a **tokenização precisa estar habilitada na conta** (em produção, via gerente de contas).

### 6.4 Cancelar
- Pausa: `status: INACTIVE` (não gera novas cobranças; reativar exige novo `nextDueDate`).
- Cancelamento: `DELETE /v3/subscriptions/{id}` encerra a recorrência **e remove as cobranças pendentes e vencidas**. Só chamar depois de confirmar no app; o status local vai a `CANCELLED` quando chegar `SUBSCRIPTION_DELETED`.

## 7. Webhook

### 7.1 Recepção

`POST /api/v1/webhooks/asaas`:
1. Comparar o header `asaas-access-token` com `ASAAS_WEBHOOK_TOKEN` usando `timingSafeEqual`. Token de 32–255 caracteres, sem espaços e **diferente da API key**. Falha → `401` (e alerta).
2. `INSERT INTO asaas_event (asaas_event_id, event, payload, status) VALUES (...) ON CONFLICT (asaas_event_id) DO NOTHING`.
3. Enfileirar `process-asaas-event` (jobId = `asaas_event_id`).
4. Responder **exatamente `HTTP 200`**. O Asaas trata `201`, `204`, `3xx`, `4xx`, `5xx` e timeout como falha.

Cuidados:
- Rota **fora** do rate limit geral e sem CORS/CSRF; corpo `application/json` com limite de tamanho.
- Resposta rápida: nada de regra de negócio no handler.
- Após **15 falhas consecutivas** a fila é interrompida e, depois de 14 dias parada, os eventos são **apagados**. Alertar se `asaas_event` acumular `PENDING` ou se o Asaas avisar por e-mail; reativar a fila no painel (Integrações → Webhooks).
- Liberar o endpoint no firewall/WAF (Cloudflare) para os IPs oficiais do Asaas; o sandbox pode usar IPs adicionais.
- Configurar o webhook em **cada ambiente** (sandbox e produção são independentes), com `sendType: SEQUENTIALLY` e os eventos da tabela abaixo.

### 7.2 Processamento e mapeamento para estado

Para cada evento: carregar `subscription` pelo `payment.subscription` (ou `subscription.id`); fazer *upsert* de `subscription_payment` por `external_payment_id` guardando o `payment.status` do payload; **recalcular** o status da assinatura a partir das cobranças.

| Evento | Efeito |
|---|---|
| `PAYMENT_CREATED` | Registra a cobrança. **Não** altera o status (o Asaas cria a primeira cobrança até 40 dias antes) |
| `PAYMENT_CONFIRMED` | Cobrança paga → `ACTIVE`. Para cartão, é o sinal de pago (o `RECEIVED` só vem ~32 dias depois) |
| `PAYMENT_RECEIVED` | Cobrança paga (Pix/boleto) → `ACTIVE`; atualiza `current_period_end` |
| `PAYMENT_OVERDUE` | Cobrança vencida e não paga → `PAST_DUE`, evento `payment_failed` |
| `PAYMENT_CREDIT_CARD_CAPTURE_REFUSED` | Falha de captura → `PAST_DUE` |
| `PAYMENT_REFUNDED`, `PAYMENT_PARTIALLY_REFUNDED` | Registra; alerta à operação; **não** muda status sozinho |
| `PAYMENT_CHARGEBACK_REQUESTED` / `_DISPUTE` | Registra; alerta à operação; decisão manual |
| `PAYMENT_DELETED` / `PAYMENT_RESTORED` | Atualiza o espelho local |
| `SUBSCRIPTION_CREATED` | Para o fluxo do Checkout: associa `sub_...` e `cus_...` ao tenant |
| `SUBSCRIPTION_INACTIVATED` | Alerta (pausa não iniciada por nós é anomalia) |
| `SUBSCRIPTION_DELETED` | → `CANCELLED` |
| `CHECKOUT_PAID` / expirado / cancelado | Atualiza `subscription_checkout` |
| Demais eventos | Persistir, marcar `DONE`, sem efeito (nunca lançar exceção) |

Regras de derivação (D5), implementadas em `models/subscription/billing_state.model.ts`:
- Qualquer cobrança `OVERDUE` com vencimento ≤ hoje → `PAST_DUE` (só a partir de `ACTIVE`; `TRIAL`/`EXPIRED`/`SUSPENDED` se mantêm).
- Sem atraso aberto e a cobrança de referência (maior vencimento entre as já vencidas ou pagas) paga (`CONFIRMED`/`RECEIVED`) → `ACTIVE`, desde que o vencimento dela não tenha mais de 62 dias.
- Uma cobrança paga **nunca** regride para `PENDING`/`OVERDUE` por evento atrasado (o upsert é monotônico).
- `PAST_DUE` → `SUSPENDED` após 7 dias continua no `subscription_lifecycle.job` existente, que passa a olhar o vencimento da cobrança em aberto.
- `TRIAL` só sai para `ACTIVE` por pagamento; o trial vencido sem pagamento segue para `EXPIRED` (job atual). Pagar depois reativa para `ACTIVE`.
- Toda transição inválida (ex.: `CANCELLED → ACTIVE` por evento antigo) é ignorada e registrada.

Falha no processamento: `asaas_event.status = FAILED`, retry exponencial e, após 5 falhas, DLQ com alerta, como no outbox.

> **Checkout (cartão):** o `POST /v3/checkouts` devolve `id` e `link`; usamos o `link` e, na falta dele, `{checkoutBaseUrl}/checkoutSession/show?id=`. Enviamos `customer` (o cliente do tenant, criado por nós) e `externalReference = tenantId`. O OpenAPI do Asaas lista só `customerData` no corpo, enquanto o guia diz que `customer` é aceito — **validar no sandbox** (pergunta 2 da §16). O formato do payload dos eventos `CHECKOUT_*` também não foi lido: o processador tenta `checkout.id`/`checkout.checkoutId` e ignora o evento se não achar.

## 8. Reconciliação

Job diário `reconcile-asaas-subscriptions` (worker), além dos webhooks:
1. Selecionar assinaturas com `billing_provider = ASAAS` e (cobrança em estado intermediário há mais de N dias, `current_period_end` vencido sem pagamento, ou sem evento há 48 h).
2. `GET /v3/subscriptions/{id}` e `GET /v3/subscriptions/{id}/payments` (paginado, com `offset`/`limit` até esgotar).
3. Comparar com o espelho local; corrigir divergências pelo mesmo caminho do §7.2; gravar auditoria `SUBSCRIPTION_RECONCILED` com o que mudou.
4. Respeitar a cota (25.000 req/12 h; 50 GETs concorrentes): lotes pequenos e sem concorrência alta.

Também executar a reconciliação sob demanda (script de operação) para recuperar um período em que a fila ficou pausada.

## 9. Idempotência e retries nas chamadas ao Asaas

- Timeout **não** é falha: antes de repetir uma criação, procurar o recurso já criado (`externalReference = tenantId` em customers e subscriptions).
- A `Idempotency-Key` do nosso endpoint vira o identificador interno da operação, criado **antes** da primeira chamada e reutilizado em todos os retries.
- Evitar criação concorrente com lock (`pg_advisory_xact_lock` por tenant ou lock Redis) ao criar customer/assinatura.
- Classificar o erro: `400` de validação e `401/403` não sofrem retry; `429` e `5xx` sofrem backoff.
- Não registrar corpo de requisição com dados do cliente em log.

## 10. Configuração e segredos

| Variável | Notas |
|---|---|
| `ASAAS_ENV` | `sandbox \| production` |
| `ASAAS_BASE_URL` | `https://api-sandbox.asaas.com/v3` ou `https://api.asaas.com/v3` |
| `ASAAS_API_KEY` | Só em env/secret do EasyPanel; nunca no repo, no frontend ou em log |
| `ASAAS_WEBHOOK_TOKEN` | 32–255 caracteres; diferente da API key |
| `ASAAS_USER_AGENT` | Ex.: `odonto-saas/1.0` |
| `BILLING_PROVIDER` | `asaas \| manual` (kill switch; `manual` mantém o fluxo atual) |

- Boot falha se `ASAAS_ENV` e o prefixo da chave divergem.
- Se a API do Asaas cair, o app continua funcionando (somente o checkout fica indisponível); o `BILLING_PROVIDER=manual` permite a operação ativar à mão.
- Rotação de chave documentada em runbook (a chave é do tipo que se gera/desabilita no painel).

## 11. Segurança, LGPD e auditoria

- Nenhum dado de cartão passa pelo nosso servidor (Checkout hospedado).
- O CPF/CNPJ do Owner é enviado ao Asaas como dado pessoal necessário à cobrança: incluir na política de privacidade e no ROPA; não logar.
- O token do webhook é validado em tempo constante; o endpoint não devolve detalhes de erro.
- Auditoria (`writeAuditLog`): `SUBSCRIPTION_CHECKOUT_CREATED`, `SUBSCRIPTION_PAYMENT_CONFIRMED`, `SUBSCRIPTION_STATUS_CHANGED` (ator `SYSTEM`, origem `ASAAS_WEBHOOK`), `SUBSCRIPTION_RECONCILED`.
- **Princípio mantido:** suspensão continua sendo somente leitura + exportação; falha de cobrança nunca sequestra dado de paciente.

## 12. Conta pessoa física e NFS-e

A API de assinaturas, cobranças e webhooks não distingue PF de PJ. Pontos a confirmar com o Asaas antes do go-live:
- limites de recebimento e regras de saque da conta PF;
- se a conta PF pode **emitir NFS-e** (a emissão automática exige conta habilitada, serviço municipal e dados tributários, via `POST /v3/subscriptions/{id}/invoiceSettings`). Enquanto não for possível, a nota da assinatura fica fora do escopo (RF-E10-16) e o texto comercial não deve prometê-la;
- exigência de aprovação/documentação da conta de produção (no sandbox a conta é aprovada automaticamente).

## 13. Observabilidade

- Log estruturado por operação: `tenantId`, `subscriptionId`, `external_*`, `asaas_event_id`, resultado, tentativa. Sem segredos.
- Métricas e alertas: webhook `401`; `asaas_event` em `PENDING` há mais de 5 min; `FAILED`/DLQ; `5xx`/`429` do Asaas; assinatura em `PAST_DUE` além de 7 dias; divergências achadas pela reconciliação; tempo do job.
- Painel interno (script/consulta): últimas cobranças e eventos por tenant.

## 14. Testes

**Sandbox (obrigatório antes de produção)** — conta sandbox própria, chave `$aact_hmlg_`, URL pública para o webhook (ngrok/Cloudflare Tunnel em dev):
- criar customer + assinatura Pix/boleto, simular o pagamento e ver `ACTIVE`;
- Checkout com cartão de teste: `CHECKOUT_PAID` → `SUBSCRIPTION_CREATED` → `PAYMENT_CONFIRMED`;
- gerar nova cobrança de uma assinatura (recurso do sandbox) e ver `PAYMENT_CREATED` sem mudar status;
- atraso → `PAYMENT_OVERDUE` → `PAST_DUE` → 7 dias → `SUSPENDED`;
- cartão recusado → `PAST_DUE`;
- cancelamento → `SUBSCRIPTION_DELETED` → `CANCELLED`.

**Automatizados (`backend/tests/subscription/`)** — adapter com servidor fake, sem chamar o Asaas:
- evento duplicado (mesmo `id`) processado **uma vez**, as duas requisições recebem `200`;
- `OVERDUE` atrasado após `RECEIVED` não rebaixa;
- eventos fora de ordem convergem para o mesmo estado;
- token inválido → `401` e nada gravado;
- campo desconhecido no payload não quebra;
- timeout na criação da assinatura + retry não cria duplicata;
- webhook de tenant inexistente/cross-tenant não vaza dado (resposta `200`, evento marcado e ignorado);
- `test:rls` cobre `subscription_payment` e `subscription_checkout`; `asaas_event` coberto por teste de grants.

## 15. Checklist de go-live

- [x] ADR-0017 aceito (supersede o ADR-0010)
- [ ] docs/08 §2.10, módulo 10 e RF E10 atualizados
- [ ] Chave e URL de produção configuradas; nenhuma credencial de sandbox no ambiente
- [ ] Webhook de produção cadastrado (`SEQUENTIALLY`, token próprio), acessível externamente e testado
- [ ] Fluxo ponta a ponta real controlado (uma cobrança de baixo valor)
- [ ] Cenários de falha testados (duplicado, timeout, fora de ordem, token errado)
- [ ] Logs, alertas e job de reconciliação ativos
- [ ] Plano de contingência: `BILLING_PROVIDER=manual`, runbook de fila pausada e de rotação de chave
- [ ] Texto comercial e política de privacidade revisados (PF, CPF/CNPJ, NFS-e)

## 16. Perguntas abertas — respostas da homologação (sandbox, 2026-10-12)

1. **Checkout `RECURRENT` aceita só cartão?** Sim (`billingTypes` aceita `CREDIT_CARD` e `PIX`; usamos só cartão). Pix/boleto recorrentes entram pela assinatura via API.
2. **`customer` no checkout?** Aceito, mas exige **telefone e endereço** no cliente. Decisão: checkout **sem** `customer`; o Asaas coleta os dados do titular. Ligação ao tenant: id do checkout (`checkoutSession` em `SUBSCRIPTION_CREATED`/`PAYMENT_CREATED`, `checkout.id` em `CHECKOUT_PAID`) + `externalReference` do checkout = tenant (só aparece em `CHECKOUT_*`).
3. **Link de Pagamento:** descartado (ADR-0017).
4. **Tokenização para trocar valor/vencimento em assinatura de cartão em produção:** continua a confirmar com o gerente de contas (não afeta o MVP: upgrade/downgrade e troca de cartão são *Should*).
5. **Conta PF:** o sandbox não distingue. Limites de recebimento e NFS-e continuam a confirmar com o Asaas antes do go-live.
6. **Retentativa do cartão do Asaas × 7 dias de `PAST_DUE`:** não testável no sandbox sem esperar; acompanhar na primeira cobrança real.

Payloads verificados: `CHECKOUT_CREATED`, `CHECKOUT_PAID`, `SUBSCRIPTION_CREATED` (com `creditCard.{brand,token,last4}`), `PAYMENT_CREATED/RECEIVED/CONFIRMED/OVERDUE`, `SUBSCRIPTION_DELETED`. URL pública obrigatória nas URLs de retorno.

## 17. Impacto na documentação

- [ADR-0017](../adr/0017-billing-saas-asaas.md) criado (Asaas como gateway) e [ADR-0010](../adr/0010-billing-saas-manual-mvp.md) marcado como supersedido. O RF-E10-10/18 sobe de *Could* para *Must* da fase (a atualizar em [RF E10](../requisitos/funcionais/10-billing-saas.md)).
- [Módulo 10](../modulos/10-billing-saas.md) §5 (cobrança) e §8 (eventos) e [docs/08](../08-api-v1.md) §2.10 (checkout e webhook).
- [docs/07](../07-modelo-de-dados.md): tabelas novas. [docs/11](../11-infra-devops.md): variáveis e IPs. Runbooks: fila pausada e rotação de chave.

## 18. Referências (Asaas)

Autenticação · Chaves de API · Sandbox · Criando um cliente · Assinaturas (introdução, criação, cartão, FAQ) · Asaas Checkout (assinatura recorrente) · Link de pagamento · Webhooks (recepção, idempotência, tipos de envio, fila pausada) · Eventos de cobranças e de assinaturas · Estados, eventos e consistência · Retries e idempotência · Preparação para produção · Emitir notas fiscais automaticamente para assinaturas — todas em `docs.asaas.com/docs/`.
