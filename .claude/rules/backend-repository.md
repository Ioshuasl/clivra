---
paths:
  - "backend/src/modules/**/repositories/**/*"
---

# Backend — Repository

## Caminho

`backend/src/modules/<dominio>/repositories/<entidade>/<entidade>_<op>.repository.ts`

## Obrigatório

- Classe curta: `ListRepository`, `GetRepository`, `CreateRepository`, `UpdateRepository`, `DeleteRepository`, `GetByCpfRepository`.
- Método `execute(...)`; acesso via `TenantPrisma` / `runInTenantContext`.
- Um arquivo = uma operação.
- Mapper row ↔ entidade de domínio em `repositories/<entidade>/mappers/`.
- Update: `execute(ctx, patientId, patientSchema)` ou entidade de domínio — PK explícita.
- Traduzir erros PG conhecidos (ex.: `23P01` → `SlotUnavailableError`).

## Proibido

- Prefixo da entidade na classe (`PatientCreateRepository` ❌).
- Parâmetro genérico `data`.
- Orquestração entre repositories / publicação de eventos (isso é Action/Service).
- Importar Express / controllers.

## Exemplo

```ts
// patient_create.repository.ts
export class CreateRepository {
  constructor(private readonly db: TenantPrisma) {}
  async execute(ctx: RequestContext, patient: Patient): Promise<void> { /* ... */ }
}
```

Norma: `docs/16`, `docs/06-multi-tenancy.md`, ADR-0004.
