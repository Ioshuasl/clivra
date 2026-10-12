---
paths:
  - "backend/src/**/jobs/**/*"
  - "backend/src/worker.ts"
  - "backend/src/shared/queue/**/*"
---

# Backend — Workers / Jobs

## Caminho

- Entry: `backend/src/worker.ts` (mesmo artefato da API, comando diferente).
- Infra de fila: `backend/src/shared/queue/` (provisório — ver `backend-shared.md`).
- Handlers do domínio: `backend/src/modules/<dominio>/jobs/`.
- Dispatcher de eventos: job `platform` / `dispatch-outbox` (não publicar Redis no use case).

Norma: ADR-0006, `docs/11` §7, `docs/16`.

## Obrigatório (todo job)

1. **Idempotência** — entrega *at-least-once*; tolerar reexecução (`jobId`, chave natural, unique ou checagem de estado).
2. **`tenantId` + `requestId`** no payload/contexto; abrir RLS (`TenantPrisma` / `runInTenantContext`) antes de qualquer `SELECT`.
3. **Payload por referência** — IDs e metadados mínimos; **nunca** dado clínico no payload Redis.
4. Retry com backoff + limite; falha definitiva → DLQ + alerta.
5. Timeout e log estruturado com `requestId` / `tenantId` (sem PII clínica).
6. Cron **por tenant** no timezone da clínica (não do servidor).
7. Job de mensagem: janela de silêncio (21:00–08:00 fuso do tenant), consentimento e créditos **antes** de enviar.

## Outbox

- Eventos de domínio: gravar em `outbox_event` **na mesma UoW** do agregado.
- **Proibido** `queue.add` / publish Redis dentro de service/action do caso de uso síncrono.
- Dispatcher (`dispatch-outbox`) lê outbox e enfileira no BullMQ.

## Filas (MVP)

`messaging` · `scheduling` · `billing` · `reporting` · `platform` — detalhes em `docs/11` §7.

## Proibido

- Job sem contexto de tenant.
- Payload com prontuário / anamnese / imagem clínica embutida.
- Lógica de domínio rica no handler sem passar por service/action/models do módulo.
- Dependência de HTTP (`req`/`res`) no worker.

## Em dúvida

Perguntar: nome da fila, idempotency key, se o efeito deve ser outbox vs port síncrono.
