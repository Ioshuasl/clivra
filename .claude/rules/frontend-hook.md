---
paths:
  - "frontend/src/packages/**/hooks/**/*"
---

# Frontend — Hook

**Fluxo:** Component → Hook → Service → Data → API

## Por tipo (obrigatório)

### List / Get (`usePatientListHook`, `usePatientGetHook`)

- `useQuery` com `queryKey` estável (`['patients', 'list', query]`).
- `queryFn` chama Service — nunca Data/API direto.

### Create / Update / Delete (`usePatientCreateHook`, …)

- `useMutation` com `mutationFn` = Service.
- `onSuccess`: `invalidateQueries` nas keys da entidade.
- Mutação otimista (agenda) com rollback no próprio hook.

### FormHook (`usePatientFormHook`)

- Centraliza `useForm`, `defaultValues`, `zodResolver(schema)`.
- **Não** coloca `useForm` no JSX do Form/FormDialog.
- **Não** faz fetch.

## Proibido

- CollectionHook legado obrigatório (substituído por TanStack Query).
- Chamar API/`fetch` direto.
- Lógica de reset do form dentro do FormHook (reset no componente).

Norma: `docs/09`, `docs/16`.
