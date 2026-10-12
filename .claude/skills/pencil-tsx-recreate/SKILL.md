---
name: pencil-tsx-recreate
description: >-
  Recria componentes React/TSX no Pencil MCP com fidelidade visual
  (Shadcn + Tailwind → .pen) usando o Design System Clivra. Use ao recriar
  Form/Dialog/Index/Table no canvas Pencil a partir de frontend/**/*.tsx.
---

# Pencil ← TSX (fidelidade visual) — Clivra

Recria a UI de um `.tsx` no canvas Pencil. Paths do projeto: `frontend/` (não `app/`).

**Não** gera código em `frontend/`. **Não** substitui `designer-ui` nem `frontend-orchestrator`.

Norma visual: [`01-clivra-design-system.md`](../../../01-clivra-design-system.md) · tokens: [01-tokens-kit.md](../../docs/ui/01-tokens-kit.md).

## Prompt canônico (aplicar verbatim)

Usando as ferramentas MCP do Pencil conectadas ao canvas ativo, recrie o formulário React contido em @[Arquivo].tsx com 100% de fidelidade visual, aplicando a identidade Clivra (Sora, Burgundy #4A0F16, background #F7F5F2).Siga estas regras de mapeamento do Shadcn UI + Tailwind:Mapeamento de Primitivos: Identifique componentes do Shadcn (Card, Input, Label, Button, Select) e desenhe-os no Pencil respeitando o design system Clivra (bordas border-input #DDD8D3, fundos bg-background/bg-card, primary burgundy, cantos rounded-md 8 / card 12-14).Tipografia e Cores: Mapeie as cores semânticas do Tailwind para tokens Clivra (text-muted-foreground #6B6663, text-foreground #1A1A1A, bg-primary #4A0F16). Hierarquia Sora (labels 12-13/500, títulos semibold).Layout e Grid: Respeite rigorosamente as classes de layout como grid grid-cols-1 md:grid-cols-2, gap-4 e space-y-6. Calcule as posições X/Y no canvas do Pencil para refletir esses espaçamentos exatos.Estados Visuais: Renderize os inputs no estado padrão, mas inclua as margens corretas de foco/placeholder simuladas visualmente.Execute as ferramentas do MCP passo a passo para gerar o layout e valide a estrutura final de camadas antes de concluir

regra obrigatória: qualquer dúvida/tomada de decisão você precisa me perguntar

## Regra bloqueante — perguntas

**Qualquer dúvida ou tomada de decisão → perguntar ao usuário e esperar resposta.** Não assumir.

Perguntas típicas **antes** de desenhar:

1. Arquivo `.pen` destino (novo dedicado vs canvas ativo)
2. Substituir conteúdo existente vs frame(s) novo(s)
3. Escopo de abas/estados (só aba ativa / um frame por aba / todos)
4. Filhos embutidos (`*Index`, tables): completo vs placeholder
5. Estado visual: vazio (create) vs preenchido (edit) + dados de exemplo
6. Breakpoint (ex.: desktop `md` / notebook **1366×768**)

Se o MCP não estiver no `.pen` certo: pedir para abrir o arquivo e confirmar com `get_editor_state`.

## Fontes (economia de tokens)

| Ler | Quando |
|-----|--------|
| Este `SKILL.md` | Sempre ao invocar |
| O `.tsx` alvo (+ filhos só se escopo pedir) | Sempre |
| [01-tokens-kit.md](../../docs/ui/01-tokens-kit.md) | Tokens / TabTrigger / TabInline |
| [07-ui-components-map.md](../../docs/ui/07-ui-components-map.md) | Só se mapear primitivos |
| [checklist.md](checklist.md) | Gate final |

**Proibido:** monólito UI; vários shards “por precaução”; `Read`/`Grep` em `.pen` (só MCP Pencil); galeria Orius / tokens Notion.

Galeria de referência: documento Pencil **Clivra** do projeto. Componentes **não** referenciam outro `.pen` — copiar/recriar no arquivo destino.

## Tokens Clivra (atalho)

| Token | Valor light | Tailwind |
|-------|-------------|----------|
| `$--primary` | `#4A0F16` | `primary` |
| `$--secondary` | `#7A2B36` | `secondary` |
| `$--accent` | `#A85B67` | `accent` |
| `$--foreground` | `#1A1A1A` | `text-foreground` |
| `$--muted-foreground` | `#6B6663` | `text-muted-foreground` |
| `$--background` | `#F7F5F2` | `bg-background` |
| `$--muted` | `#EAE6E1` | `bg-muted` |
| `$--border` / `$--input` | `#DDD8D3` | `border` / `border-input` |
| `$--card` | `#FFFFFF` | `bg-card` |
| `$--destructive` | `#B94A55` | `destructive` |

Dialog: radius 14–16, sombra discreta. Input/Button: `rounded-md` (8); altura ~40–44. Tipografia **Sora**. Ícones **Lucide**.

## Mapeamento Shadcn → Pencil

| React | Pencil |
|-------|--------|
| `Input` / Select visual | frame h≈40–44, stroke `$--input`, `cornerRadius` 8, padding H 12; placeholder `$--muted-foreground` |
| `FormLabel` | text 12–13/500 `$--foreground` |
| `Button` default | fill `$--primary`, texto branco |
| `Button` outline | fill `$--background` ou card, stroke `$--border` |
| `TabsList` pill | TabTrigger Active\|Inactive + list `bg-muted` |
| Tabs underline | TabInline Active\|Inactive + underline `$--primary` |
| `DialogContent` | card `$--card`, width do `max-w-*`, padding 24, radius 14–16 |
| Grid `grid-cols-12 gap-4` | linhas horizontais; spans → larguras fixas ou `fill_container`; `gap` 16 |

Preferir componentes reutilizáveis no próprio `.pen` (`reusable: true`) e instanciar com `ref` + `descendants`.

## Fluxo MCP (passo a passo)

1. `get_editor_state(include_schema: true)` — confirmar `.pen` ativo e schema.
2. Ler o `.tsx` (e filhos autorizados).
3. Ler `01-tokens-kit` se precisar de tokens/tabs.
4. **Perguntar** decisões (bloco acima) → esperar.
5. Garantir canvas correto; se novo arquivo: criar/abrir e revalidar `get_editor_state`.
6. Kit local (FormField, SelectField, Buttons, Tabs) se ainda não existir no arquivo.
7. `batch_design`: um bloco lógico por vez (shell → header/tabs → conteúdo → footer). `placeholder: true` enquanto monta; `FindEmptySpace` para root frames.
8. Multi-aba: **um frame por aba** se o usuário pediu; nomear claramente.
9. Validar: `batch_get` (camadas), `snapshot_layout` (gap/colunas), `get_screenshot` (fidelidade Clivra).
10. Gate: [checklist.md](checklist.md). Resumir frames/IDs e pendências.

### Restrições Pencil

- Só editar o documento **ativo** no MCP.
- Sem `layout` em não-frames; sem `%` width; sem `alignItems: baseline|stretch`.
- Flex single-axis: grids = várias rows manuais.
- `strokeAlignment`: `inner` | `center` | `outer` (não `inside`).
- Após `Copy`/`Replace`, re-ler IDs; não `Update` filhos de `Copy` com IDs antigos.

### Iteração v2

Se o usuário pedir variante: **duplicar** frames, renomear (`v2 …`), alterar só o pedido — não sobrescrever v1 sem confirmação.

## Exemplo de invocação

```
Use pencil-tsx-recreate em PatientFormDialog.tsx
```

Seguir o prompt canônico + perguntas obrigatórias + fluxo MCP acima.
