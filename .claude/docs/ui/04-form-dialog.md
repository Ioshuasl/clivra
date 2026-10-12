# Form, FormDialog e grid — Clivra

Norma: `docs/16` · rules `frontend-component-form` / `form-dialog`.  
Visual: DS Clivra §22–§23, §33 · [01-tokens-kit](01-tokens-kit.md).  
Tipagens em `types/<Entidade>/` — **sem** pasta `interfaces/`.

## 1. Nomenclatura

| Arquivo | Uso |
|---|---|
| `PatientForm.tsx` | Formulário de **página** (fluxos longos / complexos) |
| `PatientFormDialog.tsx` | Formulário em **modal** (criação/edição curta) |

Não misturar. Formulários gigantes → página ou Drawer, não Dialog.

## 2. Grid de campos

| Layout | Quando |
|---|---|
| 1 coluna full | Nome, observação, textarea |
| 2 colunas (desktop) | Pares (telefone / e-mail; CPF / nascimento) |
| 1 coluna (mobile) | Sempre quando o espaço exigir |
| Lookup + botão | Busca paciente / profissional |
| Campos odontológicos | dente/face quando `requires_tooth` |

Estrutura de campo: **Label → Input → Helper / Error**. Placeholder não substitui label.

Ordem típica Patient: identidade → contatos → endereço → consentimentos → ação.

Input: h 40–44, radius 8, border `#DDD8D3` / token `border`, focus ring burgundy.

## 3. FormHook

- `usePatientFormHook` centraliza `useForm` + Zod
- Componente: `form.handleSubmit(onSave, onError)`
- Sem `useForm` / `defaultValues` / `resolver` inline no JSX
- Reset no FormDialog via `handleForm` + `useEffect`

## 4. FormDialog

- Props em `types/Patient/PatientFormDialogTypes.ts`
- Index monta só quando aberto
- Create vs Update: Data decide método HTTP (`POST`/`PATCH`) — não o Form
- Footer: outline (cancelar) + primary burgundy (salvar) — um primary

## 5. Form de página (longo)

Quando o formulário for extenso (ex.: orçamento, configuração de clínica):

- cards empilhados na main (surface + border)
- Sidebar 360 de navegação (ver [05](05-sidebar-details.md))
- progressive disclosure: cadastro principal primeiro, vínculos depois

## 6. Bloqueios de produto (exemplos)

| Contexto | Regra de UI |
|---|---|
| Paciente menor | Exigir responsável antes de aprovação de orçamento |
| Sem CRO no profissional | Bloquear assinar evolução (mensagem clara) |
| Assinatura suspensa | Somente leitura + exportação liberada |

Mensagens em pt-BR; erros de API via `code` estável (`docs/08`). Toast para feedback de mutação — não substitui erro permanente de formulário.
