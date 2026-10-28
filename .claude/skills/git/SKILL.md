---
name: git
description: >-
  Operações Git no repositório único do SaaS odontológico. Cria branches,
  sugere mensagens de commit (pattern-commits), merge com confirmação.
  Use ao pedir skill git, branch, ou sugestão/mensagem de commit.
---

# Git — SaaS Odontológico

## Contexto

**Um único repositório Git** na raiz do projeto (`clivra`).

Não há multi-repo `app`/`api` separados. Paths de código: `backend/`, `frontend/`, `docs/`, `.claude/`.

## Quando usar

- Criar / recriar branch.
- Sugerir mensagem de commit (pattern-commits).
- Merge (com confirmação).
- Usuário invoca a skill **git**.

**Não usar** para: push, PR ou rebase (salvo pedido explícito **ou** fechamento verde da skill `sprint-orchestrator`).  
**Não fazer commit** salvo pedido explícito **ou** fechamento verde da skill `sprint-orchestrator`.  
**NUNCA** injetar trailer `Co-authored-by` (Claude ou outro) sem perguntar.

## Referência de commits

`.claude/docs/pattern-commits/pattern-commits.md`  
(Se o padrão citar tickets `DSAAS-*`, adaptar ao prefixo que o usuário informar; se não houver ticket, omitir.)

Em dúvida de mensagem/escopo → **perguntar**.

---

## Comando 1: criar branch

### Entrada

1. **Nome da branch**
2. **Código fonte** (opcional) — default `main`; se outra branch, nasce de `main` e recebe merge da fonte

Se o nome faltar → perguntar.

### Passos

```bash
git fetch origin main
git checkout main
git pull origin main
git checkout -b <nome-da-branch>
# se fonte != main:
git fetch origin <codigo-fonte>
git merge origin/<codigo-fonte>
```

Reportar tip; **sem push** salvo pedido explícito.

---

## Comando 2: sugerir commit

1. `git status` + `git diff` (+ staged) + `git log -5 --oneline`
2. Ler pattern-commits
3. Propor mensagem (imperativo, ≤72 no subject)
4. Só `git commit` se o usuário pedir
5. Sem `Co-authored-by`

---

## Comando 3: merge

1. Confirmar branch base, origem (branch/commit), e se pode commitar
2. Executar merge/cherry-pick
3. Validar (lint/typecheck se existirem scripts)
4. Reportar resultado; sem push salvo pedido

## Saída

```
Repo: (raiz do projeto)
Branch: …
Ação: …
Resultado: …
Pendências: …
```
