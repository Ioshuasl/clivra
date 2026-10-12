---
paths:
  - "backend/src/modules/**/services/**/*"
---

# Backend — Service

## Caminho

`backend/src/modules/<dominio>/services/<entidade>/<entidade>_<op>.service.ts`

## Obrigatório

- Classe curta: `ListService`, `GetService`, `CreateService`, `UpdateService`, `DeleteService`, `GetByCpfService`.
- Fluxo principal em `execute(ctx, ...)`.
- Parâmetro tipado `<entidade>Schema` — **proibido** `data`.
- Update: `execute(ctx, patientId, patientSchema)`.
- Unicidade: chamar `GetBy<Uk>Service` antes de create/update.
- Com efeito colateral → delegar a `CreateAction` (etc.).
- Sem efeito → chamar `CreateRepository` (etc.) direto.
- Não importa `@prisma/client` nem Express.

## Proibido

- Prefixo da entidade na classe (`PatientCreateService` ❌).
- SQL / Prisma Client.
- Controller / rotas.
- Action desnecessária em CRUD puro.

## Exemplo

```ts
export class CreateService {
  constructor(
    private readonly getByCpf: GetByCpfService,
    private readonly createAction: CreateAction,
  ) {}
  async execute(ctx: RequestContext, patientSchema: PatientCreateSchema) { /* ... */ }
}
```

Norma: `docs/16`, `docs/05`.
