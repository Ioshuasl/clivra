# Benchmark de lacunas — módulos do Clivra vs. mercado

Pesquisa feita em 2026-10-28 (Firecrawl: comparativos de 8 sistemas brasileiros; páginas do Simples Dental, Dentrix, Oryx, CareStack, tab32; resolução CFO-91/2009). Complementa [02 — Benchmark de Mercado](../02-benchmark-mercado.md).

**Ressalvas:** quase todas as fontes são páginas comerciais e blogs. A página de funcionalidades do Open Dental retornou 404. A RDC 1002 da Anvisa foi lida só em fontes secundárias e precisa ser confirmada no texto oficial. A existência de funcionalidades no Clivra foi inferida por busca no código (`backend/src/modules`), não por teste funcional.

## 1. Mínimo de mercado

O comparativo de 2026 usa 8 áreas: agenda, prontuário, financeiro, nota fiscal, WhatsApp, CRM, IA e operação avançada (estoque, protético, multiunidade, convênio). Nenhum sistema cobre as 8 no plano de entrada.

Núcleo repetido nos checklists brasileiros: odontograma, anamnese, evolução e fotos; agenda com confirmação por WhatsApp; financeiro com fluxo de caixa; orçamento com tabela TUSS/CBHPO; documentos com assinatura eletrônica; comissões; alertas de retorno; permissões.

Plataformas gringas (Dentrix, Open Dental, Curve, CareStack, tab32, Oryx) acrescentam: verificação de convênio, envio eletrônico de guias e baixa automática do retorno (e-claims, eligibility, ERA); portal do paciente; pagamento por link e parcelamento; planos de assinatura da própria clínica (in-house membership); diagnóstico por imagem com IA.

## 2. Comparativo com os módulos atuais

| Módulo | O que o Clivra tem | O que falta |
|---|---|---|
| Pacientes | Cadastro, responsável legal, consentimentos, linha do tempo | Origem/indicação (captação); tags e segmentos; importador de outros sistemas (fase 2 em docs/04) |
| Agenda | Status por cor, recorrência, bloqueios, fila de espera, link público, cadeiras | Recall/alerta de retorno; check-in; sala de espera; agendamento com vários procedimentos ou profissionais |
| Atendimento (prontuário) | Anamnese por link, odontograma, evolução, alertas clínicos, anexos | Receituário e atestado; documentos e termos com assinatura; periograma; fichas por especialidade; evolução por voz com IA; visualizador de radiografia |
| WhatsApp | QR, automações D-1/H-3, caixa de entrada, modelos, log | Campanhas (retorno, aniversário); régua de cobrança; NPS; atendente com IA |
| Orçamento | Por dente/face, aprovação por link, plano de tratamento, parcelas | Contrato junto do orçamento; funil de orçamento parado; tabela de preço por convênio; opções de orçamento (plano A/B) |
| Financeiro | A receber, a pagar, caixa, categorias, estorno, crédito | Comissionamento; Pix/boleto/link com baixa automática; NFS-e; conciliação bancária; financiamento ao paciente |
| Relatórios | Painel inicial, faltas, receita, inadimplência, produção, exportação | Metas; ticket médio e conversão de orçamento; funil; ranking de unidades; retorno e reativação |
| Configurações | Clínica, horários, cadeiras, procedimentos, equipe, auditoria | Tabelas de convênio; regras de comissão; modelos de documento; multiunidade na interface; plano de contas |

Já existem e são diferenciais: assinatura do SaaS (Asaas) e LGPD (exportação e solicitação do titular).

## 3. Módulos inexistentes

| Módulo | Por que importa | Quem já tem |
|---|---|---|
| Documentos e assinatura (contrato, termo, receita, atestado) | Citado em quase todo comparativo como obrigatório | Simples, Clinicorp, Codental, Odontiva |
| Comissões | Dono paga dentistas parceiros por produção; hoje só há relatório de produção | Todos, exceto Codental |
| Convênios e TISS/TUSS | Guia no padrão ANS e acompanhamento de glosa | EasyDental, Controle Odonto, A2Odonto, Clinicorp |
| Recall e CRM | Retorno semestral, aniversariantes, orçamentos parados | Todos |
| Estoque e protético | Material com validade; trabalhos enviados ao laboratório | Dental Office, Codental, EasyDental |
| Pagamentos integrados e NFS-e | Pix, boleto e link com baixa automática; nota de serviço | Simples (Plus), Clinicorp, A2Odonto |
| Planos de assinatura da clínica | Mensalidade do paciente sem convênio, cobrança recorrente | Gringos (CareStack); no Brasil o Capim financia o tratamento |
| Portal/app do paciente | Ver consultas, assinar, pagar | Simples, Clinicorp, Dental Office, Controle Odonto |
| Biossegurança e esterilização | Rastreio de lote de esterilização (Anvisa) | Nenhum concorrente encontrado anunciando |
| IA | Atendente 24 h no WhatsApp, evolução por voz | Simples, A2Odonto, Codental, Clinicorp |

## 4. Pontos regulatórios

- **Prontuário sem papel:** CFO-91/2009 só autoriza se o sistema cumprir o NGS2, que exige assinatura digital ICP-Brasil. `docs/04` prevê "assinatura simples" no MVP.
- **Guarda:** mínimo de 20 anos (Lei 13.787/2018, segundo as fontes lidas). Conferir retenção e backup, inclusive quando a clínica cancela.
- **Esterilização:** fonte secundária cita a RDC 1002 exigindo registro de lote por carga. Confirmar no texto oficial.

## 5. Prioridade sugerida

| Prioridade | Itens |
|---|---|
| P0 — sem isso perde a venda | Documentos e assinatura; receituário e atestado; comissão; recall e alerta de retorno |
| P1 — paridade comercial | Pix/boleto/link com baixa automática; funil de orçamento parado; convênio e TISS; NFS-e; estoque |
| P2 — diferenciais | Planos de assinatura da clínica; portal do paciente; biossegurança; IA no WhatsApp e evolução por voz |

## 6. Decisões pendentes

1. **Assinatura dos documentos:** simples (rápida e barata) ou ICP-Brasil (validade legal plena, mas exige certificado do dentista)?
2. **Convênio odontológico:** entra no produto ou o Clivra assume clínica só particular?
3. **Comissão:** regra simples (percentual por profissional) agora, ou esperar regras complexas?
