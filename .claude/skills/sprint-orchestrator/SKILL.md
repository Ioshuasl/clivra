---
name: sprint-orchestrator
description: >-
  Orquestra uma sprint inteira do SaaS odontológico: lê o checklist em
  docs/desenvolvimento/sprints/, monta fila Must por Bloco, executa cada
  demanda em subagente general-purpose sequencial (backend-orchestrator,
  frontend-orchestrator ou tester), roda smokes do bloco e pnpm tester no fim,
  corrige falhas (máx. 2 ciclos) e fecha com docs + commit + push. Use ao pedir
  skill sprint-orchestrator, executar sprint S0–S8 ou “rodar a sprint”.
---

# Sprint Orchestrator

## Objetivo

Executar **uma sprint completa** (backend + frontend + testes) de ponta a ponta, **sempre sequencial**.

## Decisões fechadas (não reabrir sem o usuário)

| Tema | Valor |
|------|--------|
| Subsessão | Agent `general-purpose` **uma por demanda**; aguardar término; **nunca** paralelo |
| Demanda | `### Bloco N` da sprint; checkboxes Must = DoD |
| Fila | Só **Must** |
| Testes | Smoke/E2E listados **no bloco** após a subagente do bloco; `pnpm tester` **full no fim** |
| Falha | Demanda de correção → fix → retest; **máx. 2** ciclos; inferir BE/FE; ambíguo → perguntar |
| Dúvida produto | **Pausar a fila inteira** até resposta |
| Board | `.claude/skills/sprint-orchestrator/.run/<sprint-id>/` |
| Fechamento docs | Atualizar checkboxes Must em `docs/desenvolvimento/sprints/S*.md` |
| FE extra | Dentro da subagente FE: `designer-ux` / `shadcn` / `ui-ux-pro-max` se tela nova |
| Git | Após testes verdes: **commit + push** automáticos (exceção autorizada desta skill) |

Detalhes: [reference.md](reference.md) · board: [scripts/Init-SprintBoard.ps1](scripts/Init-SprintBoard.ps1)

## Entrada

1. Identificador da sprint (`S7`, `S6`, …) **ou** path do arquivo em `docs/desenvolvimento/sprints/`.
2. Se faltar → perguntar. Se várias sprints “planejada” → perguntar qual.

## Fluxo obrigatório

```
Sprint Progress:
- [ ] 1. Ler esta skill + reference.md
- [ ] 2. Init board (Init-SprintBoard.ps1) + validar fila Must
- [ ] 3. Mostrar fila ao usuário (1x) e seguir (salvo pedido de alterar)
- [ ] 4. Para cada demanda PENDING: um subagente (Agent), esperar, atualizar board
- [ ] 5. Após cada bloco: smokes/E2E citados no DoD (se houver)
- [ ] 6. Fim dos blocos: skill tester / pnpm tester (full)
- [ ] 7. Se vermelho: ciclo fix (≤2) — ver abaixo
- [ ] 8. Marcar checkboxes Must na sprint em docs/
- [ ] 9. Commit + push (pattern-commits; sem force; sem Co-authored-by)
- [ ] 10. Relatório final no chat
```

### Passo 4 — Subagente sequencial (bloqueante)

Para **cada** demanda, **uma** chamada Agent por vez:

- `subagent_type`: `general-purpose` (ferramenta Agent)
- `run_in_background`: **false** (aguardar)
- `model`: omitir (herda o da sessão) salvo o usuário pedir outro
- **Proibido:** lançar 2+ subagentes de demanda no mesmo turno; **proibido** qualquer execução paralela de blocos da sprint

Prompt do subagente: template em [reference.md](reference.md) (inclui path da skill + DoD + cortes da sprint + “perguntar e parar se ambíguo”).

| Título do bloco contém | Skill obrigatória no subagente |
|------------------------|---------------------------|
| `Backend` | `.claude/skills/backend-orchestrator/SKILL.md` |
| `Frontend` | `.claude/skills/frontend-orchestrator/SKILL.md` |
| (correção inferida BE) | backend-orchestrator |
| (correção inferida FE) | frontend-orchestrator |
| (só testes) | `.claude/skills/tester/SKILL.md` |

Se o título não deixar claro BE vs FE → **perguntar** e pausar a fila.

Subagente de **frontend** (tela nova): pode acionar `designer-ux`, `shadcn`, `ui-ux-pro-max` **dentro** da mesmo subagente, na ordem: UX (se preciso) → shadcn (se primitivo faltar) → implementar com frontend-orchestrator.

Ao retornar o subagente: atualizar `board.md` (`done` / `blocked` / `failed`) + append em `history.md`. Se `blocked` por pergunta → **não** avançar a fila.

### Passo 5 — Smoke do bloco

Se o DoD listar `pnpm test:…`, `test:…`, aceite PowerShell ou `e2e/…`:

1. Rodar **só** esses comandos (não a suite full).
2. Falha → criar demanda `fix:<bloco>` (não contar ainda como ciclo de suite full); corrigir com subagente do agente certo; reexecutar o smoke do bloco **uma** vez. Se ainda falhar → pausar e perguntar (não queimar os 2 ciclos da suite full sem necessidade).

### Passo 6–7 — Suite full + correção

1. Executar skill **tester** (`pnpm tester`).
2. Ler `.claude/skills/tester/.run/last-report.md`.
3. Se pass → passo 8.
4. Se fail → montar 1+ demandas de correção (agrupar por responsável):

| Falha | Responsável |
|-------|-------------|
| `test:*` smoke API / acceptance PowerShell / arch backend | backend-orchestrator |
| Playwright / e2e | frontend-orchestrator (salvo erro claramente de API) |
| typecheck misturando BE+FE | perguntar se ambíguo |
| ensure-stack / infra | perguntar |

5. Executar correções **em sequência** (subagentes), depois `pnpm tester` de novo.
6. Repetir no máx. **2 ciclos** (suite full vermelha → fixes → suite). No 3º vermelho → **parar**, entregar relatório e perguntar.

### Passo 8 — Docs da sprint

Marcar `- [ ]` → `- [x]` nos itens **Must** concluídos do arquivo `docs/desenvolvimento/sprints/S*.md`.  
Atualizar linha **Estado** para refletir fechamento de código (ex.: código Must fechado / testes verdes).  
Não inventar aceite de produto (M2/M3 piloto) como feito se a sprint separar “uso real”.

### Passo 9 — Commit + push (obrigatório no sucesso)

**Autorizado por esta skill** quando a suite full estiver verde (exceção às rules gerais de “só commit se pedir”).

1. `git status` · `git diff` · `git log -5 --oneline`
2. Seguir `.claude/docs/pattern-commits/pattern-commits.md`
3. Stage arquivos da sprint (código + docs da sprint + board se versionado — **não** stage `.run/` gitignored nem `.env`)
4. Commit (subject ≤72, imperativo), **sem** `Co-authored-by`
5. `git push -u origin HEAD` (ou push se upstream já existe)
6. **Nunca** `--force` / `-f` em main/master; **nunca** `--no-verify` sem pedido explícito extra

Se push falhar (auth/rede) → reportar e **não** fingir sucesso.

## Gate de pergunta

Qualquer ambiguidade de produto/DDL/contrato/UX **ou** responsável de fix ambíguo → perguntar (`product-decisions.md`) e **pausar a fila**.

## Proibido

- subagentes de bloco em paralelo
- Incluir Should/Could na fila automática
- Pular `pnpm tester` no fim
- Mais de 2 ciclos full fix→test sem perguntar
- Commit/push com suite vermelha
- Force push

## Saída no chat

```
Sprint: S#
Fila: N blocos Must
Concluídos: …
Falhas/correções: …
Tester: pass|fail (ciclos usados: 0–2)
Docs: atualizado|pendente
Git: commit <sha> · push ok|falhou
Board: .claude/skills/sprint-orchestrator/.run/S#/
```
