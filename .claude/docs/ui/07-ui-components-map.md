# Mapa de componentes `shared/ui` — Clivra

Ler **só** quando houver dúvida de qual primitivo usar.  
Path alvo: `frontend/src/shared/ui/` (shadcn + Tailwind; ver `docs/09`).  
Tokens: [01-tokens-kit.md](01-tokens-kit.md) · norma: [`01-clivra-design-system.md`](../../../01-clivra-design-system.md) §57–§59.

Reutilizar e estilizar componentes existentes — **não** criar um segundo sistema paralelo.

## 1. Princípios

- Tokens semânticos (`bg-primary`, `text-foreground`, …) — sem hex hardcoded se houver token
- Fonte Sora; ícones Lucide
- Foco visível (`focus-visible`); erro com `aria-invalid` + destructive
- Componentes de `shared/ui` são **burros** (props; sem domínio)
- Domínio (Patient, Agenda) fica em `packages/.../components`

## 2. Primitivos previstos / preferenciais

| Componente | Uso |
|---|---|
| `Button` | primary / secondary / outline / destructive / ghost |
| `Input` / `Textarea` / `Label` | formulários |
| `Select` / `Combobox` | seleção (Combobox para busca de paciente) |
| `DatePicker` / `TimePicker` | agenda — consistente entre módulos |
| `Dialog` / `Drawer` / `DropdownMenu` / `Popover` | FormDialog, confirmações, filtros |
| `Tabs` | seções de formulário / prontuário |
| `Table` / DataTable | Index CRUD |
| `Badge` / StatusBadge | status (fundo suave + texto semântico) |
| `Toast` / Sonner | feedback de mutação |
| `EmptyState` / `Skeleton` / `Separator` / `Tooltip` | estados e auxiliares |
| `MoneyInput` / `CpfInput` / `PhoneInput` | máscaras BR |
| `PageHeader` / `Breadcrumbs` / `TableToolbar` | composição de página |
| `Odontogram` / `AgendaGrid` / `Timeline` | domínio clínico/operacional (package ou shared se 2+ usos) |

## 3. Hierarquia de botões

1. **Primary** (burgundy) — uma por contexto/header  
2. **Secondary / Outline** — secundárias  
3. **Destructive** — só com confirmação  
4. **Ghost / icon** — ações de linha / menus

## 4. Altura e radius

- Button / Input: h ~40–44px, radius 8
- Card: radius 12–14; Dialog: 14–16
- Badge / Avatar: pill (`9999`)

Implementação real do DS no código prevalece; documente a faixa no shard, não invente segundo kit.

## 5. O que não vai em `shared/ui`

- `PatientForm`, `AppointmentCard`, regras de status clínico
- Chamadas API / hooks de domínio
- Cores Orius / Notion / Geist / Inter como identidade
