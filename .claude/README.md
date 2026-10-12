# Como usar as skills — SaaS Odontológico Multi-Tenant

Guia de **skills**, **prompts** e fluxos. Norma de pastas/código: `docs/16-estrutura-de-pastas.md`.

**Biblioteca de prompts:** [copie e cole abaixo](#biblioteca-de-prompts-copie-e-cole).

---

## Biblioteca de prompts (copie e cole)

Troque `Patient`, `patients`, `operacional` pelo seu caso. No chat **Agent**, cole o bloco.

### Backend (`backend-orchestrator`)

**P1 — CRUD completo**

```
Use a skill backend-orchestrator.
Módulo: patients.
Entidade: Patient.
Crie o CRUD completo (list, get, create, update, delete) seguindo docs/16 e as rules do .claude.
Action só se houver efeito além do repositório.
Não use código legado Orius/Python como modelo.
```

**P2 — Só schema + repository**

```
Use a skill backend-orchestrator.
Módulo: patients.
Entidade: Patient.
Implemente APENAS schemas Zod + repositories (list/get/create/update/delete).
Não crie action, service, controller nem routes ainda.
```

**P3 — Uma operação**

```
Use a skill backend-orchestrator.
Módulo: patients.
Entidade: Patient.
Implemente somente a operação create, em todas as camadas necessárias até a route.
```

**P4 — Com efeito colateral (Action)**

```
Use a skill backend-orchestrator.
Módulo: patients.
Entidade: Patient.
Operação: create (persiste + outbox patient_created).
Use CreateAction além do CreateRepository.
```

---

### Frontend (`frontend-orchestrator`)

**P5 — Index (listagem)**

```
Use a skill frontend-orchestrator.
Package: operacional.
Entidade: Patient.
Tipo de tela: Index.
Implemente Index + Table + Columns + usePatientListHook (TanStack Query) + Header.
NÃO implemente Form ainda.
```

**P6 — FormDialog**

```
Use a skill frontend-orchestrator.
Package: operacional.
Entidade: Patient.
Tipo de tela: FormDialog.
Obrigatório: FormHook, types em types/Patient/, handleForm, modais só quando abertos.
```

**P7 — Form de página**

```
Use a skill frontend-orchestrator.
Package: operacional.
Entidade: Patient.
Tipo de tela: Form de página (com Sidebar 360 se longo).
```

**P8 — Ligar Index ao FormDialog**

```
Use a skill frontend-orchestrator.
Entidade: Patient.
O Index já existe. Adicione FormDialog create/edit e ConfirmDialog delete.
Mutations invalidam queryKey ['patients'].
```

---

### Design UX / UI (Clivra)

Fonte oficial: `01-clivra-design-system.md` (raiz). Shards: `.claude/docs/ui/`.

**P9 — Escolher tipo de tela**

```
Use a skill designer-ux.
Cenário: recepção lista e cadastra pacientes.
Não altere código.
Qual padrão Clivra usar (Index, FormDialog, Form, Details)?
```

**P10 — Frame Pencil**

```
Use a skill designer-ui.
1 frame apenas: Index CRUD para Patient.
Design System Clivra (Sora, Burgundy). Não implemente React nesta tarefa.
```

**P11 — Consultar padrão visual**

```
Use a skill ui-ux-systems.
Explique Page Header e Sidebar 360 no padrão Clivra.
Não altere arquivos.
```

**P12 — Refator visual**

```
Use a skill ui-refactor.
Arquivo:
frontend/src/packages/operacional/components/Patient/PatientIndex.tsx
Alinhe Header/empty state ao Design System Clivra.
NÃO altere hooks, services, data nem payloads.
```

---

### Sequência recomendada

**P13 — Backend**

```
Use a skill backend-orchestrator.
Módulo: patients. Entidade: Patient.
CRUD completo na API.
```

**P14 — Frontend (depois do P13)**

```
Use a skill frontend-orchestrator.
Mesma entidade Patient.
Index + FormDialog.
TanStack Query; types/ e enum/; sem interfaces/.
```

---

### Git (`git`)

Repo **único** na raiz do projeto.

**P15 — Branch**

```
Use a skill git.
Crie a branch feature/patient-crud a partir de main.
Não faça push.
```

**P16 — Sugerir commit**

```
Use a skill git.
Sugira a mensagem de commit (pattern-commits).
Ainda NÃO faça o commit.
```

**P17 — Commitar**

```
Use a skill git.
Sugira a mensagem e, se ok, faça o commit.
Sem Co-authored-by. Sem push.
```

---

### Sprint (`sprint-orchestrator`)

**P18 — Executar sprint Must completa**

```
Use a skill sprint-orchestrator.
Sprint: S7.
Fila Must por Bloco, Tasks sequenciais (backend/frontend), smoke do bloco, pnpm tester no fim.
Se falhar: correção (máx. 2 ciclos). No sucesso: atualizar checklist em docs + commit + push.
```

---

## Qual skill?

| Eu quero… | Skill | Prompt |
|-----------|-------|--------|
| CRUD API | `backend-orchestrator` | P1–P4, P13 |
| Tela React | `frontend-orchestrator` | P5–P8, P14 |
| Tipo de tela | `designer-ux` | P9 |
| Pencil (Clivra) | `designer-ui` | P10 |
| Ler padrão visual Clivra | `ui-ux-systems` | P11 |
| Polir visual (Clivra) | `ui-refactor` | P12 |
| Branch / commit | `git` | P15–P17 |
| Sprint inteira | `sprint-orchestrator` | P18 |
| Suíte de testes | `tester` | (skill tester / `pnpm tester`) |

---

## Fluxos

### Backend

```text
Routes → Controller → Service → [Action?] → Repository
(+ models / types / enum / schemas)
```

### Frontend

```text
Page → Component → Hook (TanStack Query) → Service → Data → API
```

---

## Onde está cada coisa

```text
.claude/
  README.md     ← este guia
  CLAUDE.md     ← mapa para o agente
  rules/        ← regras por camada
  skills/       ← manuais das skills
  docs/ui/      ← shards visuais (Clivra; norma: 01-clivra-design-system.md)
docs/           ← norma do produto (16, 05, 09, …)
backend/
frontend/
```

Em dúvida ou decisão → **perguntar ao usuário**.
