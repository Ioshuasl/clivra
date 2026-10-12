---
name: designer-ui
description: >-
  Cria e ajusta camada visual no Pencil (.pen) seguindo o Design System Clivra
  (01-clivra-design-system.md). Lê no máximo 1 shard de tokens + 1 frame.
---

# Designer UI — Clivra

Projeto: Clivra (SaaS odontológico multi-tenant). Paths: `frontend/`.  
Norma visual: [`01-clivra-design-system.md`](../../../01-clivra-design-system.md).

## Política de tokens (obrigatória)

**Proibido:** Notion-like; Orius / galeria Orius; monólito UI; vários shards; abrir **mais de 1 frame** Pencil por turno; carregar rules/skills de CRUD frontend sem necessidade.

| Tarefa | Ler | Não ler |
|--------|-----|---------|
| Ajuste visual / novo frame | [01-tokens-kit.md](../../docs/ui/01-tokens-kit.md) + **1 frame** Pencil | outros shards; frontend rules |
| Só tokens/átomos | `01` + frame kit | fluxos longos (`02`–`05`) |

Índice: [`.claude/docs/ui/INDEX.md`](../../docs/ui/INDEX.md)  
Princípios curtos (só se não for implementar frame): `ui-ux-systems`.

## Pencil — 1 frame por turno

| Necessidade | Frame |
|-------------|-------|
| Átomos | Kit Clivra |
| Shell (sidebar burgundy + header) | Shell |
| Dialog / Details actions | Dialog / Details |
| CRUD estados | Index / estados |
| Página Index / Form+Sidebar / Details / FormDialog | frames “Página — …” |

Galeria: documento Pencil **Clivra** do projeto (MCP Pencil only — nunca Read/Grep `.pen`). **Não** usar `padrao-ui-ux-orius-pencil.pen`.

## Tokens (resumo; detalhe em `01`)

- Primary `#4A0F16` · Secondary `#7A2B36` · Accent `#A85B67`
- Foreground `#1A1A1A` · Muted-fg `#6B6663` · Background `#F7F5F2` · Border `#DDD8D3`
- Destructive `#B94A55` · Sidebar `#4A0F16` / texto branco
- Button/Input h 40–44, radius-md 8; Card 12–14; Dialog 14–16; **Sora**; **Lucide**

## Regras

- Hierarquia antes de efeitos; reutilizar kit Clivra; estados (loading/vazio/erro/bloqueio/sucesso).
- Page Header: título + descrição + 1 primary burgundy; footer dialog: outline + primary.
- Sidebar Form/Details: ~360 sticky (≠ nav do app burgundy).
- Não alterar fluxo/IA/copy sem registrar para `designer-ux`.
- Validar mentalmente **1366×768**.

## Fluxo

1. Briefing + `01` (se preciso).
2. Abrir **um** frame no documento Clivra.
3. Aplicar layout/tokens/estados.
4. Resumo para `frontend-orchestrator` / `ui-refactor`.

## Checklist

- [ ] Tokens Clivra (Sora, burgundy, warm background)?
- [ ] Um primary por zona; estados previstos?
- [ ] Sem resíduos Orius/Notion?
- [ ] Pronto para `frontend/`?
