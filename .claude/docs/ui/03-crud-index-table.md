# CRUD: Index, Table, Columns — Clivra

Norma: `docs/16` · `docs/09` · rules `frontend-component-index|table|columns`.  
Visual: [`01-clivra-design-system.md`](../../../01-clivra-design-system.md) §27–§31 · [01-tokens-kit](01-tokens-kit.md).

Exemplo canônico: **Patient** em `frontend/src/packages/operacional/`.

## 1. Página de listagem

```
[ Page Header: título + descrição + CTA primary "Novo paciente" ]
[ Card (surface + border, radius 12–14) ]
  [ Toolbar: busca / filtros ]
  [ DataTable ]
  [ Paginação / load more ]
```

Densidade moderada; cabeçalho claro; ações contextualizadas (menu `⋯`).

## 2. Estados

| Estado | Comportamento |
|---|---|
| **Dados** | Linhas legíveis; coluna principal em weight 600 |
| **Carregando** | Skeleton nas linhas; header/filtros estáveis |
| **Vazio** | Empty state útil (o quê / por quê / o que fazer) + CTA |
| **Erro** | Mensagem acionável + tentar novamente (`requestId` só em detalhes técnicos) |
| **FormDialog** | Criar/editar curto em modal (montado só se aberto) |
| **ConfirmDialog** | Exclusão / inativação |
| **Row actions** | Menu `⋯` → Editar / Remover (labels curtas + Lucide) |

## 3. Padrão `Index`

Arquivo: `components/Patient/PatientIndex.tsx`

1. `PageHeader` / Header (title, description, CTA)
2. `PatientTable` com dados do hook
3. `ConfirmDialog` / `PatientFormDialog` **condicionais**
4. Hooks:
   - `usePatientListHook` → `useQuery`
   - `usePatientCreateHook` / `Update` / `Delete` → `useMutation` + `invalidateQueries(['patients'])`

### Regras

- Index **não** chama Data/API/Service
- Index centraliza open/close de modais e callbacks `onEdit` / `onDelete`
- Table nunca é desenhada “na mão” no Index
- Cache = TanStack Query (sem CollectionHook legado)
- Cores via tokens Clivra (`bg-background`, `bg-card`, `bg-primary`, …)

```tsx
{isFormOpen && <PatientFormDialog ... />}
{isConfirmOpen && <ConfirmDialog ... />}
```

## 4. Padrão `Table` / `Columns`

- `PatientTable.tsx` — apresentacional; props tipadas em `types/Patient/PatientTableTypes.ts`
- `PatientColumns.tsx` — `ColumnDef`; ações curtas (`Editar`, `Remover`)
- Sem fetch; sem regra de negócio
- Evitar excesso de bordas, cores em todas as colunas e sombra na tabela

## 5. Paginação

Preferir cursor da API (`meta.nextCursor`) ou load more alinhado a `docs/08`.  
UI: label de página/estado + botões outline.

## 6. Exemplos de entidades

| Entidade | Package | CTA |
|---|---|---|
| Patient | `operacional` | Novo paciente |
| Procedure | `admin` | Novo procedimento |
| Quote | `clinico` | Novo orçamento |
| Receivable | `financeiro` | Novo título |
