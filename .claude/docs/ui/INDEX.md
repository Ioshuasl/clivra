# UI/UX — índice (economia de tokens)

**Projeto:** Clivra (SaaS odontológico multi-tenant).  
**Paths:** `frontend/` · packages `operacional` / `clinico` / `financeiro` / `admin` / `messaging` / `public`.  
**Norma de código:** `docs/16`, `docs/09`.

**Fonte oficial visual:** [`01-clivra-design-system.md`](../../../01-clivra-design-system.md) na raiz do repositório.

**Proibido:** padrões Notion-like, Orius / Orius provisional, paletas antigas (`#FF781F`, `#37352F`), fontes Geist/Inter como identidade, monólito UI ou vários shards “por precaução”.  
**Obrigatório:** ler só o(s) arquivo(s) da matriz; em dúvida visual profunda → o DS Clivra na raiz.

Cheat sheet: `.claude/skills/ui-ux-systems/SKILL.md`

## Matriz tarefa → arquivo

| Tarefa | Ler |
|--------|-----|
| Tokens, tipografia, radius, sombras, mapeamento CSS | [01-tokens-kit.md](01-tokens-kit.md) |
| Anatomia de página, shell, fluxos, copy | [02-anatomia-fluxos.md](02-anatomia-fluxos.md) |
| Index + Table + Columns (CRUD listagem) | [03-crud-index-table.md](03-crud-index-table.md) |
| Form / FormDialog / grid | [04-form-dialog.md](04-form-dialog.md) |
| Sidebar 360 + Details / atendimento | [05-sidebar-details.md](05-sidebar-details.md) |
| Select / empty / loading / error | [06-select-estados.md](06-select-estados.md) |
| Qual componente de `frontend/src/shared/ui` usar | [07-ui-components-map.md](07-ui-components-map.md) |

Máximo típico por turno: **1–2 shards**. DS completo só quando o shard não bastar.

## Hábitos de prompt

- Mencionar skill **e** tipo: `frontend-orchestrator, só Index CRUD Patient`.
- Evitar “segue o padrão UI completo” sem escopo.
- Não misturar `designer-ui` + `frontend-orchestrator` + vários shards no mesmo turno.
- Backend: `backend-orchestrator` → só rules das camadas (não shards UI).
- Identidade: **Clivra · Sora · Burgundy `#4A0F16` · viewport 1366×768**.

## Pencil (1 frame)

| Necessidade | Frame |
|-------------|-----------------|
| Átomos / tokens | Kit Clivra |
| Tabs / Sidebar app | Shell |
| CRUD / Index | Página Index |
| Form + Sidebar 360 | Página Form+Sidebar |
| Details | Página Details |
| FormDialog | Página FormDialog |

Galeria Pencil: documento Clivra do projeto (MCP Pencil; **1 frame por turno**). Não usar galeria Orius.
