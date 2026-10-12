# Pattern Commits — SaaS Odontológico

Norma de mensagens de commit deste repositório (repo único na raiz).

## 1. Tipos

| Tipo | Descrição |
| --- | --- |
| `feat` | Nova funcionalidade |
| `fix` | Correção de bug |
| `docs` | Documentação (`docs/`, `.claude/`, README) |
| `style` | Formatação sem mudança de comportamento |
| `refactor` | Refatoração sem feat/fix |
| `perf` | Performance |
| `test` | Testes |
| `chore` | Build, deps, scripts, CI, manutenção |

## 2. Estrutura

```bash
<tipo>(escopo): <resumo no imperativo>

<corpo opcional>
```

Com ticket (quando houver):

```bash
[TICKET] <tipo>(escopo): <resumo no imperativo>
```

- **tipo** — tabela acima
- **escopo** — módulo/área afetada (recomendado)
- **resumo** — imperativo, preciso, ≤ **72** caracteres no subject
- **TICKET** — opcional; use o identificador que você informar (sem prefixo fixo obrigatório)

### Escopos sugeridos

| Escopo | Quando |
| --- | --- |
| `patients` / `scheduling` / `clinical-records` / `treatments` / `billing` / `messaging` / `identity` / `clinic` / `subscription` / `reporting` | Módulo de domínio backend/frontend |
| `frontend` | UI transversal / shared |
| `backend` | Plataforma API (shared, middlewares, prisma) |
| `docs` | Documentação de produto |
| `claude` | Rules/skills/shards em `.claude/` |
| `infra` | Docker, CI, deploy |

## 3. Exemplos

```bash
feat(patients): adiciona create de paciente com Action e outbox

fix(scheduling): impede double-booking no CreateRepository

docs(claude): alinha shards UI ao Design System Clivra

refactor(frontend): troca CollectionHook por TanStack Query no Index

chore(claude): atualiza rules backend para Express e Prisma

[ODONTO-12] feat(messaging): conecta webhook WhatsApp com idempotência
```

## 4. Diretrizes

- Imperativo: *adiciona*, *corrige*, *atualiza*, *remove* — não “adicionado” / “correção de”.
- Evite genéricos: `ajustes`, `modificações`, `wip`, `update`.
- Um commit = uma intenção clara; corpo só se precisar de contexto técnico.
- **Nunca** incluir trailer `Co-authored-by` (Claude ou outro) sem pedido explícito.
- Não commitar segredos (`.env`, tokens, chaves).

## 5. Relação com a skill `git`

A skill `.claude/skills/git/SKILL.md` usa este arquivo como fonte da mensagem. Em divergência, prevalece **este** documento; se o ticket/escopo estiver ambíguo, **perguntar ao usuário**.
