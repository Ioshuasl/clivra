---
name: ui-ux-systems
description: >-
  Cheat sheet UI/UX do Clivra. Use ao revisar padrão sem implementar um tipo de
  tela. Detalhe: shards em .claude/docs/ui/ (nunca monólito). Fonte oficial:
  01-clivra-design-system.md na raiz.
---

# UI e UX — Clivra

## Política de tokens

- Esta skill é o **resumo**. Detalhe: [`.claude/docs/ui/INDEX.md`](../../docs/ui/INDEX.md) → **um** shard.
- Norma completa: [`01-clivra-design-system.md`](../../../01-clivra-design-system.md).
- **Proibido** Notion-like, Orius, vários shards de uma vez, ou monólito UI.
- Em CRUD: preferir shard da matriz do `frontend-orchestrator`.
- Paths: `frontend/` · packages por área (`operacional`, `clinico`, …) · `docs/16`.

## Princípios

1. Clareza antes de decoração.
2. Uma ação primária por contexto.
3. Densidade controlada; progressive disclosure.
4. Precisão clínica + simplicidade premium.
5. Consistência Index / Form / Details / Sidebar.
6. Notebook first (**1366×768**).

## Tokens (light)

| Token | Valor |
|-------|-------|
| primary (Burgundy) | `#4A0F16` |
| secondary | `#7A2B36` |
| accent | `#A85B67` |
| foreground | `#1A1A1A` |
| muted-foreground | `#6B6663` |
| background | `#F7F5F2` |
| card / surface | `#FFFFFF` |
| muted | `#EAE6E1` |
| border | `#DDD8D3` |
| destructive | `#B94A55` |
| sidebar | `#4A0F16` (texto branco) |

Button/Input h 40–44; radius-md 8; Card radius 12–14; Dialog 14–16. Tipografia **Sora**. Ícones **Lucide**.

## Anatomia

Page Header: título + descrição + **1** CTA primary (burgundy). Busca na toolbar do card, não no header.

| Tela | Layout |
|------|--------|
| CRUD | Page Header + Card DataTable |
| Form longo | Main + Sidebar sticky ~360 |
| Details | Main + Sidebar de ações |
| Dialog | Overlay + card (fluxos curtos) |
| Shell | Sidebar burgundy + Header surface |

## Família de domínio

Index · Table/Columns · Form · FormDialog · Drawer · DetailsSidebar (≠ sidebar app) · Details · Select/Combobox

## Ações

Primary / secondary / outline / destructive — **nunca** dois primary no mesmo footer.

## Estados

Skeleton · Empty útil · Error acionável · ConfirmDialog delete · loading em botão sem layout shift.

## Relação

- Detalhe: shards `docs/ui/`
- Norma completa: `01-clivra-design-system.md`
- Visual Pencil: `designer-ui` (1 frame)
- Fluxo: `designer-ux`
- CRUD: `frontend-orchestrator`
- Refactor: `ui-refactor`
