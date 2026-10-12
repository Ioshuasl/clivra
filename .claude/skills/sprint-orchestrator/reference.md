# Sprint Orchestrator — referência

## Paths

| Item | Path |
|------|------|
| Sprints | `docs/desenvolvimento/sprints/S*-*.md` |
| Progresso | `docs/desenvolvimento/PROGRESSO.md` (append só se o usuário pedir; fechamento mínimo = checklist da sprint) |
| Board runtime | `.claude/skills/sprint-orchestrator/.run/<SprintId>/` |
| Tester report | `.claude/skills/tester/.run/last-report.md` |

`<SprintId>` = `S7`, `S6`, … (prefixo do arquivo).

## Board (`board.md`)

Gerado por `scripts/Init-SprintBoard.ps1`.

```markdown
# Board S7

- Sprint file: docs/desenvolvimento/sprints/S7-….md
- Status: running|paused|done|failed
- Updated: ISO-8601

## Queue (Must only)

| # | id | title | agent | status | notes |
|---|----|-------|-------|--------|-------|
| 1 | B1 | Backend: inbox foundation | backend | pending | |
| 2 | B2 | … | backend | pending | |

## Fix queue (runtime)

| # | id | title | agent | status | cycle |
|---|----|-------|-------|--------|-------|

## Tester

- Full runs: 0
- Last: —
- Fix cycles used: 0 / 2
```

Statuses: `pending` · `running` · `done` · `failed` · `blocked` · `skipped`

## DoD (checkboxes)

Incluir no DoD do subagente linhas `- [ ]` / `- [x]` do bloco que **não** contenham (case-insensitive):

- `should`
- `could`
- `escorrega`
- `se couber` (tratar como Should — fora da fila Must automática)

Linhas com `smoke`, `test:`, `e2e/` → DoD de implementação **e** gatilho de smoke pós-bloco.

## Template de prompt — subagente implementação

Copiar e preencher:

```
Você é uma subsessão sequencial do sprint-orchestrator (NÃO paralelizar outras demandas).

Sprint: <S#>
Demanda: <id> — <title>
Arquivo da sprint: <path>
Skill obrigatória (LEIA E SIGA AGORA): <path-da-skill-SKILL.md>

Regras globais: .claude/rules/project-core.md + product-decisions.md
Se backend: rules backend-*.md conforme camadas. Se frontend: frontend-*.md + no máx. 1–2 shards .claude/docs/ui/

Cortes / fora de escopo da sprint: respeitar seção "Fora desta sprint" e "Decisões de corte".
Só Must. Não implementar Should/Could salvo o DoD abaixo marcar explicitamente como Must.

DoD (marcar mentalmente; ao final liste o que ficou feito):
<checklist Must do bloco>

Frontend + tela nova: se necessário, use designer-ux / shadcn / ui-ux-pro-max DENTRO desto subagente antes/durante a UI.

Gate: qualquer dúvida/ambiguidade → PARE e pergunte ao usuário (não invente). Responda com bloqueio claro.

Saída obrigatória:
Implementado: …
Arquivos: …
DoD: item → done|pending
Bloqueios: …
Validação local sugerida: …
```

## Template de prompt — subagente correção

```
Você é uma subsessão de CORREÇÃO do sprint-orchestrator (ciclo <n>/2).

Skill: <backend-orchestrator|frontend-orchestrator SKILL.md>
Falha origem (tester/smoke):
<item id, log resumido, comando>

Corrija a causa raiz com o menor diff possível. Não expandir escopo da sprint.
Dúvida → perguntar e parar.

Saída: causa · arquivos · como revalidar
```

## Ordem típica S7 (exemplo)

1. B1–B5 backend subagentes  
2. B6–B7 frontend subagentes  
3. `pnpm tester`  
4. fixes se preciso  
5. docs checklist  
6. commit + push  

## Init board (CLI)

```powershell
pnpm sprint:board -- -Sprint S7
# ou
powershell -NoProfile -ExecutionPolicy Bypass -File .claude/skills/sprint-orchestrator/scripts/Init-SprintBoard.ps1 -Sprint S7
```

## Commit sugerido (fechamento)

```
feat(<escopo>): complete sprint S# Must (code + tests)

Close checklist in docs/desenvolvimento/sprints. Tester green.
```

Escopo: módulo principal (`messaging`, `billing`, …) ou `sprint` se multi-módulo.
