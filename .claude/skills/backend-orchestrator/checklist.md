# Checklist de conformidade — Backend

**Ler só no gate final.**

## Pré

- [ ] Módulo, entidade, operação e camadas identificados
- [ ] Action justificada (ou omitida se CRUD puro)
- [ ] Rules `backend-*.md` das camadas usadas
- [ ] DDL/contrato ambíguo perguntado (ou inexistente)
- [ ] Alinhado a `docs/16`

## Por camada

### Models / Types / Enum
- [ ] Invariantes em `models/` se houver
- [ ] Tipagens em `types/`; enums em `enum/`; sem `interfaces/`

### Schema
- [ ] Zod; update sem PK no body
- [ ] Consumidores com `<entidade>Schema` (não `data`)

### Repository
- [ ] Classe curta; um arquivo por op; `TenantPrisma`
- [ ] Mapper row ↔ domínio

### Action (se existir)
- [ ] Efeito real além do repositório
- [ ] Classe curta; sem HTTP

### Service
- [ ] Classe curta; `execute(ctx, …)`
- [ ] Unicidade via `GetBy<Uk>Service` quando aplicável

### Controller / Routes / Registration
- [ ] Controller fino; rotas `v1`; registrado em `/api/v1`

### Modules / Workers / Shared (se aplicável)
- [ ] Cruzamento só via `*_public.ts`
- [ ] Job: tenantId + requestId, idempotente, sem dado clínico no payload; outbox se evento
- [ ] Nada de regra de BC em `shared/` (layout shared pode mudar — ver rule)

## Final

- [ ] Fluxo Routes → … → Repository intacto
- [ ] Classes sem prefixo da entidade (exceto Controller)
- [ ] Prisma só na borda de repository/shared/database
- [ ] RLS/tenant context respeitado
