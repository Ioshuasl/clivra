# Select, lookups e estados — Clivra

Norma: `docs/16` · rule `frontend-component-select`.  
Visual: DS Clivra §24, §29–§32 · [01-tokens-kit](01-tokens-kit.md).

## 1. Select de domínio

Arquivo: `components/Patient/PatientSelect.tsx` (ou `ProfessionalSelect`, `ProcedureSelect`).

- Props em `types/<Entidade>/…SelectTypes.ts`
- Carrega via **List hook** (TanStack Query) — nunca Data/API no Select
- Integra com `FormField` / `field` do RHF
- Combobox quando lista grande / busca (pacientes, profissionais, procedimentos)

```tsx
<PatientSelect field={field} disabled={false} />
```

## 2. Select vs SelectObject

| Tipo | Quando | Valor |
|---|---|---|
| `Select` | lista simples | id / enum escalar |
| `SelectObject` / lookup rico | precisa do objeto (ex.: paciente com telefone) | objeto ou id + label rica |
| Modal + tabela | busca avançada (CPF, telefone) | callback de seleção |

## 3. Lookups do produto

| Caso | Padrão |
|---|---|
| Paciente no agendamento | Combobox busca nome/CPF/telefone (`docs/03` J2) |
| Procedimento no orçamento | Select com preço/duração |
| Profissional / cadeira | Select filtrado por unidade |
| Dente / face (FDI) | controle odontológico dedicado (`shared/helpers/dental`) |

## 4. Estados de UI (qualquer lista/select)

| Estado | UI |
|---|---|
| Loading | Skeleton / “Carregando…” (evitar spinner gigante de página) |
| Empty | Orientação + CTA se fizer sentido |
| Error | Mensagem clara + tentar novamente |
| Disabled | Opacidade + sem interação |
| Sem permissão | Não mostrar ação (servidor revalida) |

## 5. Empty states (copy)

Responder: o que aconteceu? por quê? o que fazer?

- Pacientes: “Nenhum paciente encontrado. Cadastre o primeiro paciente para começar a utilizar esta área.” + CTA Novo paciente
- Agenda do dia: “Nenhuma consulta neste dia.”
- Fila de espera: “Fila vazia.”
- Atendimentos: “Nenhum atendimento encontrado. Ainda não existem atendimentos registrados para este período.”

Evitar “Nenhum dado.” genérico. Erros sem jargão técnico para o usuário final.
