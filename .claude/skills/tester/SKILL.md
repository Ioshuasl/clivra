---
name: tester
description: >-
  Executa a suíte completa de testes locais do SaaS odontológico: sobe/verifica
  Docker + API/worker/web, seed, typecheck/arch, smokes unitários e de API,
  aceite PowerShell (curl.exe) e Playwright. Abre localtunnel (FE+API) só quando
  o cenário exige URL pública (ex.: webhook). Use ao pedir skill tester,
  pnpm tester, aceite completo ou regressão de testes.
---

# Tester — suíte local completa

## Objetivo

Rodar **todos** os testes/aceites de código com relatório consolidado (não fail-fast), depois de garantir que o stack está no ar.

## Entrada CLI (preferida)

Na raiz do monorepo:

```bash
pnpm tester
pnpm tester -- -Tunnel
pnpm tester -- -SkipE2E
pnpm tester -- -Only quality,smoke
```

O agente **deve** preferir `pnpm tester` / `Invoke-Tester.ps1` em vez de reinventar curl/playwright ad hoc.

Scripts: [scripts/](scripts/) · inventário: [reference.md](reference.md)

## Fluxo obrigatório (ordem)

Copiar e marcar:

```
Tester Progress:
- [ ] 1. Ler esta skill + reference.md (fases da suite)
- [ ] 2. Preflight stack (Ensure-Stack.ps1) — Docker + health API/FE/worker
- [ ] 3. Decidir tunnel (ver abaixo) — Start-Tunnel.ps1 se necessário
- [ ] 4. Seed: pnpm db:seed (sempre se health OK)
- [ ] 5. Rodar Invoke-Tester.ps1 (ou já via pnpm tester)
- [ ] 6. Entregar relatório consolidado (.run/last-report.md + resumo no chat)
- [ ] 7. Se tunnel foi aberto: avisar URLs + lembrar de Stop-Tunnel.ps1
```

### Passo 2 — Stack

1. Executar `scripts/Ensure-Stack.ps1` (sobe `docker compose up -d` se preciso; sobe `dev:api` / `dev:worker` / `dev:web` se health falhar).
2. **Não** iniciar testes se Postgres/Redis/MinIO ou API `:3333` / web `:3001` estiverem down após o ensure.
3. Se o ensure falhar → reportar o que faltou e **parar** (exceção à regra “roda tudo”: sem stack não há suite).

### Passo 3 — Tunnel (localtunnel)

**Padrão:** tunnel **desligado**.

**Ligar** quando **qualquer** condição for verdadeira:

| Gatilho | Exemplo |
|---------|---------|
| Flag `-Tunnel` / `TESTER_TUNNEL=1` | Usuário pediu exposição |
| Cenário precisa de URL pública | Webhook WhatsApp/WAHA apontando para a API local; callback externo; validação no celular via URL pública |
| Usuário citou webhook / URL pública / “expor” | Pedido explícito no chat |

Portas: **frontend `:3001` + API `:3333`** (localtunnel).

Ferramenta: **localtunnel** (`npx localtunnel`). Não usar ngrok salvo o usuário pedir na hora.

Se for **ambíguo** se o teste precisa de URL pública → **perguntar** (uma pergunta fechada) antes de abrir o tunnel.

Após abrir: gravar URLs em `.run/tunnel.json`; informar no relatório. Encerrar com `Stop-Tunnel.ps1` ao final da sessão de teste (ou avisar o usuário se o processo ficou vivo).

### Passo 4 — Seed

Com API healthy: **sempre** `pnpm db:seed` antes das fases de smoke/aceite/e2e.

### Passo 5–6 — Suite e relatório

Perfil default = **full** (ver [reference.md](reference.md)):

1. `quality` — typecheck + arch:check  
2. `unit` — checks sem HTTP de negócio (kms, crypto, split, receipt words, rls)  
3. `smoke` — todos os `pnpm test:*` / smokes de módulo  
4. `acceptance` — `backend/tests/Invoke-Acceptance.ps1` (módulos com `.ps1`)  
5. `e2e` — `pnpm test:e2e` (Playwright)

**Fail-soft:** cada item roda mesmo se o anterior falhou; o exit code final é ≠ 0 se **qualquer** item falhou.

Relatório: tabela pass/fail/duração + logs em `.claude/skills/tester/.run/`.

## Gate de pergunta

Em dúvida (escopo parcial vs full, tunnel sim/não, incluir lint, apontar webhook real) → **perguntar** e pausar. Não improvisar exposição pública “por precaução”.

## Proibido

- Expor tunnel sem gatilho da tabela acima (ou confirmação do usuário).
- Pular o Ensure-Stack.
- Substituir Playwright por “teste manual descrito”.
- Commitar `.run/` (artefatos locais).
- Inventar scripts de aceite fora de `backend/tests/` sem o usuário pedir.

## Saída esperada no chat

1. Stack: containers + processos (ok / o que subiu).  
2. Tunnel: off **ou** URLs FE/API.  
3. Seed: ok / erro.  
4. Tabela consolidada por fase/item.  
5. Próximo passo só se houver falha (qual bloco vermelho).
