# Anatomia e fluxos — Clivra

CRUD listagem: [03-crud-index-table.md](03-crud-index-table.md).  
Norma de pastas: `docs/16` · `docs/09`.  
Identidade: [`01-clivra-design-system.md`](../../../01-clivra-design-system.md) · tokens: [01](01-tokens-kit.md).

## 1. Canvas e shell

```text
┌──────────────────────────────────────────────┐
│ Sidebar │ Header                             │
│ (burgundy)├──────────────────────────────────┤
│         │ Main Content (warm background)     │
└─────────┴────────────────────────────────────┘
```

- Fundo página: `background` (`#F7F5F2`)
- Sidebar app: burgundy (`#4A0F16`) — ≠ Sidebar 360 de Details/Form
- Header: surface + border inferior
- Container: max-width ~1440px; padding 24–32px (áreas densas podem usar mais largura)
- Viewport prioritário: **1366×768** (também 1280×720, 1440×900)

Sem scroll horizontal indevido.

## 2. Page Header

Obrigatório:

1. **Título** (H1 / Sora 600)
2. **Descrição curta** (muted-foreground)
3. **Uma ação primária** à direita (burgundy)

Não empilhar stats, filtros ou metadados no header — filtros ficam na toolbar do card.

Exemplos de copy (pt-BR):

| Tela | Título | Descrição | CTA |
|---|---|---|---|
| Pacientes | Pacientes | Gerencie pacientes, informações clínicas e histórico. | Novo paciente |
| Agenda | Agenda | Consultas do dia e da semana | Novo agendamento |
| Orçamentos | Orçamentos | Propostas e aprovação | Novo orçamento |

## 3. Layout por tipo de tela

| Tipo | Layout |
|---|---|
| **CRUD listagem (Index)** | Page Header + 1 card (toolbar + DataTable) |
| **Form longo** | Main + Sidebar sticky ~360 (navegação de seções) |
| **Details / perfil** | Main (dados) + Sidebar 360 (ações rápidas) |
| **FormDialog** | Overlay + painel central (fluxos curtos) |
| **Drawer** | Detalhes rápidos, filtros, edição contextual |
| **Agenda** | Grade densa (horário × profissional) — ver DS §40 / `docs/09` |
| **Dashboard** | Page Header + Stat cards + agenda/alertas — ver DS §38 |

## 4. Fluxos do produto (orientação)

| Fluxo | Package | Padrão de tela típico |
|---|---|---|
| Cadastro paciente | `operacional` | Index + FormDialog |
| Agenda / reencaixe | `operacional` | tela dedicada (grade) |
| Atendimento / evolução | `clinico` | Details + form de evolução |
| Orçamento | `clinico` | Form longo ou Form + Sidebar |
| Financeiro (receber/caixa) | `financeiro` | Index + FormDialog / Details |
| Inbox WhatsApp | `messaging` | layout 3 colunas (`docs/09`) |

## 5. Checklist rápido de página

- [ ] Identidade Clivra (Sora, burgundy, warm background)
- [ ] Page Header com 1 CTA primary
- [ ] Estados: loading / vazio / erro / sem permissão
- [ ] Textos em pt-BR, sem jargão técnico
- [ ] Status nunca só por cor
- [ ] Validado em 1366×768 (e mobile se aplicável)
- [ ] Sem overflow horizontal
- [ ] Page (`app/.../page.tsx`) só compõe — zero fetch
