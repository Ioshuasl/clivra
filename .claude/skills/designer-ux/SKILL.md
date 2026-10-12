---
name: designer-ux
description: >-
  Define fluxos e arquitetura de informação (Index, Form, Details, Sidebar)
  antes da UI visual do Clivra. Use ao planejar telas. Lê no máximo 1–2 shards UI.
  Fonte visual: 01-clivra-design-system.md.
---

# Designer UX — Clivra

Packages: `operacional` / `clinico` / `financeiro` / `admin` / `messaging` / `public` (`docs/16`).
Em dúvida de jornada clínica → perguntar e consultar `docs/03-personas-jornadas.md`.
Identidade: [`01-clivra-design-system.md`](../../../01-clivra-design-system.md).

## Política de tokens (obrigatória)

**Proibido:** Notion-like; Orius; monólito UI; tokens §1/`01` sem necessidade visual; Pencil (salvo pedido explícito de visual); shards Index/Table ao especificar só Details.

| Tarefa | Ler | Não ler |
|--------|-----|---------|
| Escolher tipo de tela / jornada | Esta SKILL; se faltar detalhe → [02-anatomia-fluxos.md](../../docs/ui/02-anatomia-fluxos.md) | `01`, `07`, Pencil |
| Spec Details vs Form / Sidebar | [05-sidebar-details.md](../../docs/ui/05-sidebar-details.md) | `03` Index/Table |
| Spec CRUD listagem | [03-crud-index-table.md](../../docs/ui/03-crud-index-table.md) | `05` salvo Details |

Índice: [`.claude/docs/ui/INDEX.md`](../../docs/ui/INDEX.md)

## Escolher o tipo de tela

| Necessidade | Padrão |
|-------------|--------|
| Listar + CRUD | Index + FormDialog/Confirm |
| Entidade longa / workflow | Form + Sidebar ~360 (navegação de seções) |
| Consulta + ações pós-salvar | Details + DetailsSidebar |
| Cadastro auxiliar / curto | FormDialog |
| Detalhe rápido / filtros | Drawer |
| Lookup rico | Combobox / SelectObject |

## Fluxos (resumo)

**CRUD:** Page Header → Card (toolbar + DataTable) → Confirm/FormDialog (estados: dados, skeleton, vazio, delete, ⋯).

**Form longo:** Cards de etapa + Sidebar sticky; progressive disclosure.

**Details vs Form:** Form = edição + nav de seções; Details = consulta + ações na Sidebar. Não misturar no mesmo Card.

**Shell:** Sidebar app burgundy + Header surface — não competir com o conteúdo.

## Regras

- Tarefa operacional antes do visual; uma ação principal por contexto.
- Ordem: identidade → vínculos → valores → ação.
- Prever vazio, loading, erro, bloqueio, sucesso, confirmação.
- Delete com confirmação explícita.
- Viewport prioritário: **1366×768**; mobile = reorganizar, não comprimir desktop.

## Fluxo de trabalho

1. Objetivo, usuário, contexto.
2. Classificar tipo de tela.
3. Mapear jornada + estados (ler no máx. 1 shard se SKILL não bastar).
4. Entregar spec para `designer-ui` e/ou `frontend-orchestrator`.

## Checklist

- [ ] Tipo de tela correto (Clivra)?
- [ ] Estados e progressive disclosure?
- [ ] Spec implementável sem comportamento invisível?
- [ ] Sem padrões Notion/Orius?
