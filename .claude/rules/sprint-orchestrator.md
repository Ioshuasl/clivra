
# Sprint Orchestrator — regra

## Quando aplicar

- Usuário pede **skill sprint-orchestrator**, “executar a sprint”, “rodar S7”, etc.
- Há intenção de entregar **vários blocos** BE/FE + testes numa tacada só.

## Obrigatório

1. Ler `.claude/skills/sprint-orchestrator/SKILL.md` e seguir o fluxo.
2. Fila = **Must** apenas; unidade = **Bloco**; DoD = checkboxes Must.
3. **Uma** Agent `general-purpose` por demanda; `run_in_background: false`; **nunca** paralelo.
4. Smoke/E2E do bloco se listado no DoD; `pnpm tester` full no fim.
5. Falha na suite: correção inferida BE/FE; máx. **2** ciclos; ambíguo → perguntar.
6. Dúvida de produto → **pausar a fila inteira**.
7. Board em `.claude/skills/sprint-orchestrator/.run/<S#>/`.
8. Sucesso: atualizar checklist em `docs/desenvolvimento/sprints/`, depois **commit + push** (pattern-commits; sem force; sem Co-authored-by).

## Proibido

- Paralelo entre demandas da sprint
- Should/Could na fila automática
- Commit/push com tester vermelho
- Force push / pular hooks sem pedido explícito adicional
- Mais de 2 ciclos full sem perguntar ao usuário

## Exceção Git

Commit+push no fechamento verde desta skill **é autorizado** (não aplicar o “só commit se pedir” das rules gerais **neste** fechamento).
