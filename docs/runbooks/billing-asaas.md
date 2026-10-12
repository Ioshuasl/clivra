# Runbook — Cobrança da assinatura (Asaas)

Contexto: [ADR-0017](../adr/0017-billing-saas-asaas.md) · [DDT](../desenvolvimento/DDT-integracao-asaas.md). Roteiro de homologação: `backend/scripts/homolog-asaas-sandbox.ts`.

## 1. Fila de webhook pausada (o Asaas parou de entregar)

**Sintoma:** e-mail do Asaas ("fila interrompida"), assinaturas que pagaram e não ativaram, eventos `PENDING`/`FAILED` em `platform.asaas_event`. Após **15 falhas seguidas** o Asaas pausa a fila; eventos parados há mais de **14 dias são apagados** — aja rápido.

1. Descubra a causa no painel do Asaas (Integrações › Logs de Webhooks): `401` = token diferente de `ASAAS_WEBHOOK_TOKEN`; `403` = firewall/WAF bloqueando o Asaas; `5xx`/timeout = API fora do ar.
2. Corrija a causa (token, regra de WAF, deploy).
3. **Reative a fila** no painel (Integrações › Webhooks › reativar). Os eventos pendentes são reenviados.
4. Reprocesse o que ficou parado e reconcilie:
   ```bash
   pnpm --filter @repo/backend exec tsx scripts/ops-asaas-reconcile.ts --all
   ```
   (reprocessa eventos presos e consulta o Asaas de cada clínica; corrige o que o webhook não entregou).
5. Confirme: nenhum `asaas_event` em `PENDING`/`FAILED` há mais de 5 min.

## 2. Rotação de chave / token

- **API key do Asaas** (`ASAAS_API_KEY`): gere a nova no painel, troque no segredo do EasyPanel, reinicie API e worker, revogue a antiga. A chave de produção começa com `$aact_prod_`; o boot recusa chave de ambiente trocado.
- **Token do webhook** (`ASAAS_WEBHOOK_TOKEN`): troque **primeiro** no painel do Asaas e **imediatamente** no segredo + restart (entre os dois passos o webhook responde `401`; o Asaas reenvia depois). Rode o passo 1.4 se a fila pausar.
- Nunca compartilhe os valores por chat/e-mail; um token que apareceu em texto deve ser trocado.

## 3. Gateway fora do ar / checkout falhando

- O app continua funcionando; só o checkout fica indisponível (`502 BILLING_GATEWAY_ERROR`). `details.inconclusive = true` significa "pode ter sido processado": a UI repete com a mesma chave e o sistema adota a assinatura já criada (sem duplicar).
- **Kill switch:** `BILLING_PROVIDER=manual` e reinicie. O checkout passa a responder `503 BILLING_UNAVAILABLE` e a operação ativa/suspende por `backend/scripts/ops-subscription-status.ts`. Webhooks já recebidos continuam sendo processados.
- Cartão com `BILLING_MISCONFIGURED`: `APP_PUBLIC_URL` está em `localhost`. O Asaas exige URL pública nas URLs de retorno.

## 4. Divergência de status (pagou e não ativou / ativou sem pagar)

1. `ops-asaas-reconcile.ts <tenantId>` (consulta o Asaas e recalcula).
2. Se persistir, veja o espelho: `subscription_payment` do tenant e os eventos em `platform.asaas_event` (`payload` não tem dado de cartão).
3. Estorno e chargeback **não** mudam o status sozinhos: decisão da operação (logs `asaas_payment_needs_review`).

## 5. Checklist de go-live (produção)

- [ ] Conta de produção aprovada; limites da conta PF e NFS-e confirmados com o Asaas
- [ ] `ASAAS_ENV=production`, `ASAAS_API_KEY` `$aact_prod_…`, `ASAAS_WEBHOOK_TOKEN` **novo**, `BILLING_PROVIDER=asaas`, `APP_PUBLIC_URL` público
- [ ] Webhook de produção cadastrado (URL pública, token, **sequencial**, eventos `PAYMENT_*` `SUBSCRIPTION_*` `CHECKOUT_*`) e liberado no firewall/WAF
- [ ] Worker rodando (processa eventos; varredor a cada 5 min; reconciliação diária)
- [ ] Uma cobrança real de baixo valor de ponta a ponta (Pix) e uma de cartão
- [ ] Alertas: eventos `PENDING` > 5 min, `FAILED`, webhook `401`, fila pausada (e-mail do Asaas para um endereço monitorado)
- [ ] Política de privacidade/ToS revisadas (CPF/CNPJ enviado ao Asaas)
