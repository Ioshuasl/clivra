# Checklist — pencil-tsx-recreate (gate final)

Usar **somente no fim**, após screenshots/layout.

## Decisões

- [ ] Todas as dúvidas foram perguntadas e respondidas (sem assumir)
- [ ] Canvas MCP = `.pen` destino confirmado via `get_editor_state`

## Fidelidade ao TSX + Clivra

- [ ] Primitivos Shadcn mapeados (Input, Label, Button, Select, Card/Dialog, Tabs)
- [ ] Tokens Tailwind → `$--*` **Clivra** (`#4A0F16` primary, `#F7F5F2` background, `#1A1A1A` foreground, …)
- [ ] Tipografia Sora; hierarquia (labels 12–13/500, títulos semibold)
- [ ] Grid/gap do TSX respeitados (`gap-4` → 16, spans → larguras/`fill_container`)
- [ ] Estado pedido (create vazio / edit com dados) aplicado
- [ ] Filhos Index/Table no escopo acordado (completo vs placeholder)
- [ ] Sem resíduos Orius/Notion (`#FF781F`, `#37352F`, Geist, Inter como identidade)

## Pencil

- [ ] Sem Read/Grep em `.pen`
- [ ] Componentes reutilizáveis nomeados (`shadcn/…` ou `clivra/…`) quando repetidos
- [ ] Tabs: `TabTrigger*` (pill) ou `TabInline*` (underline) conforme decisão
- [ ] `placeholder` removido nos frames concluídos
- [ ] Frames nomeados e posicionados (`FindEmptySpace`, sem overlap)

## Validação

- [ ] `batch_get` — árvore de camadas coerente
- [ ] `snapshot_layout` — sem colapso / colunas iguais se aplicável
- [ ] `get_screenshot` — revisão visual do(s) frame(s)
- [ ] Resumo ao usuário: arquivos `.pen`, frames, validações, bloqueios/perguntas abertas
