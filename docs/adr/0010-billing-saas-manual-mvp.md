# ADR-0010 — Cobrança da assinatura SaaS: manual no MVP; gateways candidatos depois

- **Status:** Supersedido
- **Data:** 2026-08-11
- **Supersedido em:** 2026-10-12 por [ADR-0017](./0017-billing-saas-asaas.md) (cobrança automática via Asaas). O texto abaixo é histórico; o fluxo **manual** permanece apenas como contingência (`BILLING_PROVIDER=manual`).
- **Contexto:** Módulo `subscription` — cobrança **plataforma → clínica** (não confundir com financeiro da clínica)

## Contexto

O produto precisa de trial, planos, limites e estados (`TRIAL` → `ACTIVE` → `PAST_DUE` → `SUSPENDED`). Automatizar cartão/Pix via gateway exige CNPJ, compliance e operação financeira da plataforma prontos. O time optou por **não automatizar a cobrança no momento**, sem descartar integração futura.

## Decisão

1. **MVP / agora:** cobrança da assinatura é **manual** (fora do app ou com registro administrativo simples). O sistema continua a gerenciar:
   - trial de 14 dias;
   - planos e limites (`usage_counter`, `PlanLimitGuard`);
   - status da assinatura alterável por Owner da plataforma / operação (ativar, marcar past_due, suspender, cancelar);
   - modo somente-leitura + exportação quando suspenso/expirado.
2. **Não** integrar checkout de cartão/Pix no app nesta fase.
3. **Candidatos futuros** (escolher um quando for automatizar), todos via port `PaymentGatewayPort` / `SubscriptionBillingPort`:
   - **Stripe** (Checkout/Billing)
   - **Mercado Pago** (Assinaturas / Pix)
   - **Asaas** (assinaturas, boleto, Pix, ecossistema BR)
4. Modelo de dados já prevê `external_customer_id` / `external_subscription_id` em `subscription` para encaixar o gateway sem migração dolorosa.
5. Créditos de mensagem (WhatsApp) no MVP também podem ser creditados **manualmente** pela operação até haver checkout avulso.

## Consequências

**Positivas:** desbloqueia Sprint 0 e piloto sem depender de conta de adquirente; reduz escopo do E10; evita PCI e complexidade de webhook cedo demais.

**Negativas:** ativação de plano pagante exige processo humano; risco de atraso na conversão trial→pago — mitigar com checklist operacional e banner claro no app (“fale conosco para ativar”).

## Alternativas rejeitadas (por ora)

**Stripe/MP/Asaas já no MVP:** rejeitado temporariamente por decisão de produto/ops; permanece no radar.

**Omitir por completo o módulo subscription:** rejeitado — trial, limites e suspensão são necessários mesmo sem cobrança automática.

## Verificação

- Trial expira e passa a somente-leitura sem gateway.
- Operação consegue marcar tenant como `ACTIVE` / `SUSPENDED` de forma auditada.
- Nenhum endpoint de checkout ativo até novo ADR escolher o gateway.
- Port de billing documentada; implementação = no-op / manual adapter.

## Referências

- [docs/modulos/10-billing-saas.md](../modulos/10-billing-saas.md)
- [docs/08-api-v1.md](../08-api-v1.md) §2.10
- [docs/13-roadmap-estimativas.md](../13-roadmap-estimativas.md)
