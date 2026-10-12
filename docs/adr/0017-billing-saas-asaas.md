# ADR-0017 — Cobrança da assinatura SaaS via Asaas (assinatura recorrente + webhook)

- **Status:** Aceito
- **Data:** 2026-10-12
- **Supersede:** [ADR-0010](./0010-billing-saas-manual-mvp.md)
- **Design técnico:** [DDT — Integração Asaas](../desenvolvimento/DDT-integracao-asaas.md)
- **Contexto:** módulo `subscription` — cobrança **plataforma → clínica** (não confundir com o financeiro da clínica)

## Contexto

O ADR-0010 deixou a cobrança manual no MVP e listou Stripe, Mercado Pago e Asaas como candidatos. O MVP está praticamente completo e a cobrança manual passou a ser o principal gargalo para o piloto e para a conversão trial → pago.

A cobrança será feita pelo **Asaas, na conta da plataforma (pessoa física)**. Para a API de assinaturas, cobranças e webhooks, conta PF ou PJ é indiferente; a diferença aparece na emissão de NFS-e e em limites da conta, que ficam como ponto a confirmar com o Asaas (DDT §12).

## Decisão

1. **Gateway:** Asaas. O app integra por `SubscriptionBillingPort`, com dois adapters: **Asaas** e **Manual** (o fluxo atual do ADR-0010, mantido como contingência).
2. **Recorrência:** assinatura do Asaas (`POST /v3/subscriptions`, `cycle: MONTHLY`), um `customer` por tenant, com `externalReference = tenantId`. O Asaas gera cada cobrança; não geramos cobranças avulsas.
3. **Checkout próprio (híbrido):** a tela de planos, o resumo e a tela de sucesso são do produto.
   - **Pix e boleto:** exibidos **dentro do app**, via API (QR Code e copia-e-cola por `GET /payments/{id}/pixQrCode`; linha digitável e link do boleto). Sem PCI.
   - **Cartão:** via **Asaas Checkout** (`chargeTypes: RECURRENT`), hospedado pelo Asaas, com retorno para uma tela de sucesso do app. **O app não recebe, não trafega e não armazena dado de cartão.**
   - Formulário de cartão próprio (dados passando pelo nosso servidor) fica **fora do escopo**: colocaria a infraestrutura no escopo do PCI DSS. Reavaliar só com dado de conversão e avaliação de SAQ.
   - Link de Pagamento **não** é o caminho principal: não há vínculo com o tenant na criação do cliente.
4. **Webhook é a fonte de verdade.** Endpoint global `POST /api/v1/webhooks/asaas`: valida `asaas-access-token`, grava o evento com `UNIQUE (asaas_event_id)`, responde `HTTP 200` e processa no worker. Polling só para reconciliação (job diário).
5. **Estado derivado das cobranças**, não da ordem dos eventos. Webhook configurado como `SEQUENTIALLY`, mas a lógica tolera duplicados e fora de ordem.
6. **Trial continua nosso:** `nextDueDate` = fim do trial; a assinatura só sai de `TRIAL` por pagamento confirmado. Sem cartão no signup.
7. **Princípio mantido:** falha de cobrança nunca sequestra dado de paciente. `PAST_DUE` → `SUSPENDED` (7 dias) continua somente leitura + exportação.
8. **Sem NFS-e da assinatura** (RF-E10-16) nesta fase.
9. **Kill switch:** `BILLING_PROVIDER=manual` desliga o Asaas e devolve a operação ao fluxo manual.

## Emenda (homologação no sandbox, 2026-10-12)

O que o sandbox respondeu e mudou o desenho:

- **Cartão sem `customer`.** O checkout `RECURRENT` só aceita `customer` se o cliente tiver telefone **e** endereço. Em vez de coletar isso da clínica, o checkout de cartão é criado **sem** `customer` e o Asaas coleta os dados do titular na página hospedada. A ligação com o tenant é o **id do checkout**: `SUBSCRIPTION_CREATED` (`subscription.checkoutSession`), `PAYMENT_CREATED` (`payment.checkoutSession`) e `CHECKOUT_PAID` (`checkout.id`, `checkout.externalReference` = tenant) o trazem. O id fica em `platform.asaas_checkout_link`; o webhook varre o payload por ele. Evento sem tenant espera até 24 h por um vínculo antes de ser descartado.
- **URLs de retorno públicas.** O Asaas recusa `localhost` em `successUrl`/`cancelUrl`/`expiredUrl` (`APP_PUBLIC_URL` precisa ser público no cartão; o backend devolve `BILLING_MISCONFIGURED`).
- **Primeira cobrança no cartão = fim do teste.** Com `nextDueDate` = fim do trial, o cartão é validado, a recorrência fica ativa, mas a cobrança só ocorre nessa data. Até lá a clínica segue em `TRIAL` (a UI mostra "cartão cadastrado, cobrança em dd/mm"). Cancelar nesse período só desfaz a cobrança agendada; a conta não vira somente leitura.
- Link do checkout: o `POST /checkouts` devolve `link` (`https://sandbox.asaas.com/000/checkoutSession/show/<id>`); usamos o `link`.

## Consequências

**Positivas:** conversão trial → pago sem intervenção humana; cartão sem PCI; Pix e boleto na própria marca; port permite trocar de gateway; contingência manual preservada.

**Negativas / riscos:**
- Webhook é ponto crítico: após **15 falhas consecutivas** a fila do Asaas para, e eventos parados por mais de 14 dias são apagados. Exige alerta, reativação e reconciliação.
- Cartão sai do app para a página do Asaas (menos controle visual); mitigado com tela de retorno própria.
- Limites e NFS-e da conta PF ainda não confirmados.
- Cota da API: 25.000 requisições a cada 12 h e 50 GETs concorrentes.
- Perguntas abertas do DDT §16 (vínculo Checkout → tenant, tokenização para troca de cartão em produção) dependem de teste no sandbox.

## Alternativas rejeitadas

- **Manter cobrança manual:** não escala para o piloto.
- **Stripe / Mercado Pago:** descartados; o Asaas é o gateway da conta da plataforma e cobre Pix, boleto e cartão no Brasil.
- **Somente Link de Pagamento:** página fora da marca e sem vínculo confiável com o tenant.
- **Formulário de cartão próprio:** traz PCI DSS para a infraestrutura.
- **Cobranças avulsas geradas por nós:** reimplementaria vencimento, notificação e recorrência que o Asaas já faz.

## Verificação

- Sandbox: assinatura Pix/boleto paga → `ACTIVE`; Checkout de cartão → `CHECKOUT_PAID` → `SUBSCRIPTION_CREATED` → `PAYMENT_CONFIRMED`; atraso → `PAST_DUE` → `SUSPENDED`; cancelamento → `CANCELLED`.
- Evento com o mesmo `id` processado duas vezes não muda estado nem duplica efeito; token inválido → `401` e nada gravado.
- `OVERDUE` atrasado não rebaixa assinatura já paga.
- Nenhum dado de cartão em banco, log ou payload armazenado.
- `BILLING_PROVIDER=manual` restaura o fluxo do ADR-0010.
- Go-live conforme checklist do DDT §15.

## Referências

- [DDT — Integração Asaas](../desenvolvimento/DDT-integracao-asaas.md)
- [ADR-0010](./0010-billing-saas-manual-mvp.md) (supersedido)
- [docs/modulos/10-billing-saas.md](../modulos/10-billing-saas.md) · [RF E10](../requisitos/funcionais/10-billing-saas.md) · [docs/08](../08-api-v1.md) §2.10
- Documentação Asaas: <https://docs.asaas.com>
