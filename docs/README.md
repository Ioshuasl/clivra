# Documentação — SaaS B2B Multi-Tenant Odontológico

Planejamento do MVP de um software odontológico completo (prontuário digital, agenda online, gestão financeira e WhatsApp para clínicas), entregue como SaaS B2B multi-tenant.

## Stack e arquitetura de referência

- **Frontend:** React + TypeScript (TSX) com Next.js (App Router)
- **Backend:** Node.js + TypeScript + Express, API REST versionada (`/api/v1`)
- **Arquitetura:** monólito modular com padrão Orius (1 arquivo por operação CRUD, classes curtas) + Domain-Driven Design (`models/`), Clean Architecture e SOLID; `actions/` só com efeito além do repositório — ver [16](./16-estrutura-de-pastas.md)
- **Banco:** PostgreSQL, multi-tenancy por `tenant_id` + Row Level Security (RLS)

## Índice

| Documento | Conteúdo |
| --- | --- |
| [01 — Visão de Produto](./01-visao-produto.md) | Problema, proposta de valor, posicionamento, modelo de negócio |
| [02 — Benchmark de Mercado](./02-benchmark-mercado.md) | Análise de Simples Dental, Clinicorp, Codental e Dental Office e o que herdar |
| [03 — Personas e Jornadas](./03-personas-jornadas.md) | Personas, jornadas críticas e cenários de uso |
| [04 — Escopo do MVP](./04-escopo-mvp.md) | Dentro/fora do escopo, épicos, user stories e critérios de aceite |
| [05 — Arquitetura](./05-arquitetura.md) | Monólito modular, camadas, DDD, Clean Architecture, estrutura de pastas |
| [06 — Multi-Tenancy](./06-multi-tenancy.md) | Estratégia de isolamento, RLS, resolução de tenant, onboarding |
| [07 — Modelo de Dados](./07-modelo-de-dados.md) | Entidades, agregados, DDL de referência, migrações |
| [08 — API v1](./08-api-v1.md) | Convenções REST, versionamento, contratos por módulo, erros |
| [09 — Frontend](./09-frontend.md) | Estrutura Next.js, rotas, design system, estados e cache |
| [10 — Segurança, LGPD e Compliance](./10-seguranca-lgpd-compliance.md) | LGPD, requisitos CFO/prontuário eletrônico, auditoria, retenção |
| [11 — Infraestrutura e DevOps](./11-infra-devops.md) | Ambientes, CI/CD, observabilidade, backup, custos |
| [12 — Qualidade e Testes](./12-qualidade-testes.md) | Pirâmide de testes, padrões, lint/typecheck, Definition of Done |
| [13 — Roadmap e Estimativas](./13-roadmap-estimativas.md) | Fases, marcos, sequenciamento e riscos |
| [14 — Métricas e KPIs](./14-metricas-kpis.md) | North star, métricas de produto e de negócio SaaS |
| [15 — Glossário](./15-glossario.md) | Vocabulário do domínio odontológico e ubiquitous language |
| [16 — Estrutura de Pastas](./16-estrutura-de-pastas.md) | Padrão Orius (1 arquivo por ação CRUD), nomenclatura, fronteiras, exemplo Patient |
| [17 — Baseline de Segurança Enterprise](./17-seguranca-baseline.md) | Criptografia (envelope), auditoria, anomalias, endpoints, OWASP, Secure SDLC |
| [desenvolvimento/](./desenvolvimento/README.md) | Diário e progresso de implementação (não substitui a especificação) |
| [frontend/odontograma.md](./frontend/odontograma.md) | Odontograma (referência FDI + overlay de faces, contrato API) |
| [pesquisa/whatsapp-provedores-self-hosted.md](./pesquisa/whatsapp-provedores-self-hosted.md) | Comparativo Evolution API × OpenWA × WAHA vs Cloud API; TCO e risco de ToS (ago/2026) |
| [desenvolvimento/migracao-waha.md](./desenvolvimento/migracao-waha.md) | Plano Cloud API → WAHA (decisões, QR, env, webhook; código depois) |

### Requisitos (RF / RNF)

Catálogo rastreável do MVP — ver [requisitos/README.md](./requisitos/README.md).

- **Funcionais:** [Identidade](./requisitos/funcionais/01-identidade-acesso.md) · [Clínica](./requisitos/funcionais/02-clinica-cadastros.md) · [Pacientes](./requisitos/funcionais/03-pacientes.md) · [Agenda](./requisitos/funcionais/04-agenda.md) · [Prontuário](./requisitos/funcionais/05-prontuario.md) · [Orçamentos](./requisitos/funcionais/06-orcamentos-tratamentos.md) · [Financeiro](./requisitos/funcionais/07-financeiro.md) · [WhatsApp](./requisitos/funcionais/08-whatsapp-comunicacao.md) · [Relatórios](./requisitos/funcionais/09-relatorios.md) · [Billing SaaS](./requisitos/funcionais/10-billing-saas.md) · [Plataforma/LGPD](./requisitos/funcionais/11-plataforma-lgpd.md)
- **Não funcionais:** [requisitos-nao-funcionais.md](./requisitos/nao-funcionais/requisitos-nao-funcionais.md) (desempenho, segurança, LGPD, UX, observabilidade, DR, qualidade, …)
- **OWASP / API Security:** [RNF-seguranca-owasp.md](./requisitos/nao-funcionais/RNF-seguranca-owasp.md)

### Módulos (detalhamento funcional + domínio)

- [Identidade e Acesso](./modulos/01-identidade-acesso.md)
- [Clínica e Cadastros](./modulos/02-clinica-cadastros.md)
- [Pacientes e CRM](./modulos/03-pacientes-crm.md)
- [Agenda](./modulos/04-agenda.md)
- [Prontuário Clínico](./modulos/05-prontuario.md)
- [Orçamentos e Tratamentos](./modulos/06-orcamentos-tratamentos.md)
- [Financeiro](./modulos/07-financeiro.md)
- [WhatsApp e Comunicação](./modulos/08-whatsapp-comunicacao.md)
- [Relatórios e Indicadores](./modulos/09-relatorios.md)
- [Billing SaaS (assinatura da clínica)](./modulos/10-billing-saas.md)

### Decisões de arquitetura (ADRs)

- [ADR-0001 — Monólito modular em vez de microsserviços](./adr/0001-monolito-modular.md)
- [ADR-0002 — Multi-tenancy com banco compartilhado + RLS](./adr/0002-multi-tenancy-rls.md)
- [ADR-0003 — Versionamento da API por prefixo de URL](./adr/0003-versionamento-api.md)
- [ADR-0004 — Prisma como ORM e camada de persistência](./adr/0004-orm-prisma.md)
- [ADR-0005 — WhatsApp Cloud API oficial](./adr/0005-whatsapp-cloud-api.md) (**supersedido** pelo 0016)
- [ADR-0006 — Filas com BullMQ/Redis dentro do monólito](./adr/0006-filas-bullmq.md)
- [ADR-0007 — Envelope encryption por tenant (modelo enterprise)](./adr/0007-criptografia-envelope-tenant.md)
- [ADR-0008 — Hospedagem VPS Hostinger + AWS S3 para anexos](./adr/0008-hospedagem-vps-hostinger-s3.md)
- [ADR-0009 — E-mail transacional com Resend](./adr/0009-email-resend.md)
- [ADR-0010 — Billing SaaS manual no MVP](./adr/0010-billing-saas-manual-mvp.md) (**supersedido** pelo 0017)
- [ADR-0017 — Billing SaaS via Asaas](./adr/0017-billing-saas-asaas.md)
- [ADR-0011 — UUID v7 gerado na aplicação](./adr/0011-uuid-v7-aplicacao.md)
- [ADR-0012 — Observabilidade Sentry + logs (self-hosted depois)](./adr/0012-observabilidade-sentry-logs.md)
- [ADR-0013 — KEK/segredos locais na VPS (Vault self-hosted depois)](./adr/0013-kms-local-vps.md)
- [ADR-0014 — Deploy EasyPanel; domínios app e api](./adr/0014-deploy-easypanel-dominios.md)
- [ADR-0015 — Avaliação Evolution / OpenWA / WAHA (pesquisa)](./adr/0015-avaliacao-gateways-whatsapp-nao-oficiais.md)
- [ADR-0016 — WAHA (GOWS) default no messaging](./adr/0016-waha-default-messaging.md)

## Como usar estes documentos

1. Leia `01`, `03` e `04` para entender **o que** será construído no MVP.
2. Use `requisitos/` (RF + RNF) como checklist de aceite rastreável; detalhe de domínio fica em `modulos/`.
3. Leia `10`, `17` e o ADR-0007 antes de implementar qualquer coisa que toque dado clínico, auth ou multi-tenant.
4. Leia `05`, `06`, `07`, `08` e `16` antes de escrever a primeira linha de código — eles definem os contratos internos e a estrutura de pastas que mantêm o monólito modular saudável.
5. Cada arquivo em `modulos/` é o ponto de partida para o backlog daquele módulo (bounded context).
6. Toda decisão técnica relevante nova entra como um novo ADR em `adr/`, nunca como edição silenciosa de um documento existente.

> Escopo desta pasta: **planejamento**. Nenhum código de aplicação é assumido como existente ainda; os exemplos de código são ilustrativos e servem como referência de padrão a ser seguido na implementação.
