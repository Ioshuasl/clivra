# 09 — Frontend (Next.js + React + TypeScript)

## 1. Decisões

| Tema | Escolha | Racional |
| --- | --- | --- |
| Framework | Next.js (App Router) | Requisito do projeto; SSR para páginas públicas (SEO do link de agendamento) e RSC para telas pesadas de leitura |
| Linguagem | TypeScript `strict`, componentes `.tsx` | Requisito |
| Estilo | Tailwind CSS + design system próprio em `shared/ui` | Velocidade e consistência; evita CSS-in-JS em RSC |
| Componentes base | Radix UI primitives (acessibilidade) encapsulados no nosso DS | Acessibilidade correta sem reinventar |
| Estado servidor | TanStack Query | Cache, revalidação, mutação otimista (essencial na agenda) |
| Estado cliente | Zustand para UI local (filtros, painéis) | Leve; sem Redux |
| Formulários | React Hook Form + Zod (schemas de `contracts/`) | Mesma validação do backend |
| Tabelas | TanStack Table | Virtualização e coluna dinâmica |
| Datas | `date-fns` + `date-fns-tz` (timezone do tenant) | Agenda depende de fuso correto |
| Gráficos | Recharts | Suficiente para dashboards do MVP |
| Testes | Vitest + Testing Library; Playwright para e2e | — |
| Autenticação | Access token em memória + refresh em cookie httpOnly | Evita XSS-token em `localStorage` |
| Realtime | SSE (`/api/v1/stream`) na agenda e na inbox; fallback polling | Simples; WebSocket só se necessário |

**Regra:** o frontend não reimplementa regra de negócio. Ele valida para UX (feedback imediato) usando o mesmo schema Zod, mas a verdade e a autorização são sempre do servidor.

## 2. Estrutura de pastas

Mantém o padrão Orius do time (`packages/<área>` + camadas `components/data/services/hooks/types/enum/schemas` por entidade), com `app/` no lugar de `pages/` + `routes/` (App Router). Cada `page.tsx` é fino e só compõe o que vem de `packages/`. Racional completo e exemplo `Patient` em [16 — Estrutura de Pastas](./16-estrutura-de-pastas.md).

```
frontend/src/
├── app/                                 # ROTAS (App Router)
│   ├── (public)/                        # login, signup, agendar/[slug], …
│   ├── (app)/                           # área autenticada
│   │   ├── layout.tsx
│   │   ├── page.tsx                     # dashboard
│   │   ├── agenda/page.tsx
│   │   ├── pacientes/
│   │   │   ├── page.tsx                 # compõe PatientIndex
│   │   │   └── [id]/…                  # timeline, prontuário, …
│   │   ├── atendimento/[appointmentId]/page.tsx
│   │   ├── orcamentos/
│   │   ├── financeiro/…
│   │   ├── whatsapp/page.tsx            # conta/QR/config (E8a)
│   │   ├── inbox/page.tsx               # caixa de entrada (E8b)
│   │   ├── relatorios/                  # dashboard E9 + export + reuso E7
│   │   ├── assinatura/page.tsx          # plano/trial (OWNER)
│   │   ├── auditoria/page.tsx           # trilha de auditoria (OWNER, audit.read)
│   │   ├── privacidade/page.tsx         # DSR + export LGPD (OWNER, data.export)
│   │   └── configuracoes/…
│   ├── api/auth/[...]/route.ts
│   ├── layout.tsx
│   └── error.tsx / not-found.tsx
├── packages/
│   ├── operacional/                     # padrão Orius por entidade
│   │   ├── components/Patient/          # Index, Table, Columns, Form, FormDialog, Filter
│   │   ├── data/Patient/                # PatientListData, PatientCreateData, …
│   │   ├── services/Patient/            # PatientListService, PatientCreateService, …
│   │   ├── hooks/Patient/               # usePatientListHook (useQuery), usePatientCreateHook (useMutation)
│   │   ├── types/Patient/               # tipagens TS (sem pasta interfaces/)
│   │   ├── enum/Patient/                # enums da entidade
│   │   └── schemas/Patient/
│   │   # idem Appointment, …
│   ├── clinico/                         # ClinicalNote, Odontogram, Quote, …
│   ├── financeiro/                      # Receivable, Payment, CashSession, …
│   ├── admin/                           # Clinic, Procedure, Subscription, …
│   ├── messaging/                       # Conversation, Message, …
│   └── public/                          # auth, autoagendamento, links por token
├── shared/
│   ├── ui/
│   ├── layout/
│   ├── api/
│   │   ├── api-client.ts
│   │   └── query-client.ts
│   ├── hooks/
│   ├── auth/
│   ├── helpers/
│   └── styles/
```

Fluxo obrigatório por ação: **`Data → Service → Hook` (+ TanStack Query no hook)**.

Regras de organização:

1. **Rota é fina.** `page.tsx` cuida de parâmetros, metadata e composição. Zero fetch na página.
2. **Data** é o único lugar que chama a API daquela ação.
3. **Service** só chama Data (thin wrapper; sem montar URL).
4. **Hook** usa TanStack Query (`useQuery`/`useMutation`) e chama Service.
5. **Componente** só usa Hooks (e FormHook) — nunca Data/Service direto.
6. **Um package não importa de outro package.** Compartilhar → `shared/`.
7. **`shared/` só com 2+ consumidores reais.**
8. Arquivos frontend em **PascalCase** (`PatientCreateData.ts`); operações alinhadas ao REST: `List` / `Get` / `Create` / `Update` / `Delete`.
9. Tipagens em `types/`; enums em `enum/` — **sem pasta `interfaces/`**.
10. `Form` = página; `FormDialog` = modal — não misturar.

## 3. Cliente de API tipado

```ts
// shared/api/api-client.ts
import type { ApiError, ApiResponse } from '@repo/contracts';

class ApiClient {
  private accessToken: string | null = null;
  private refreshing: Promise<void> | null = null;

  async request<T>(path: string, init: RequestInit & { tenantId?: string } = {}): Promise<T> {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1${path}`, {
      ...init,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(this.accessToken ? { Authorization: `Bearer ${this.accessToken}` } : {}),
        ...(init.tenantId ? { 'X-Tenant-Id': init.tenantId } : {}),
        ...init.headers,
      },
    });

    if (res.status === 401 && !path.startsWith('/auth/refresh')) {
      await (this.refreshing ??= this.refresh().finally(() => (this.refreshing = null)));
      return this.request<T>(path, init);
    }

    const payload = (await res.json()) as ApiResponse<T> | ApiError;
    if (!res.ok) throw new ApiRequestError(payload as ApiError, res.status);
    return (payload as ApiResponse<T>).data;
  }
}
```

Erros são convertidos em `ApiRequestError` com `code` estável; um `ErrorBoundary` + `toast` traduz `code` em mensagem pt-BR e ação sugerida (ex.: `PLAN_LIMIT_EXCEEDED` → botão "Ver planos").

## 4. Telas críticas — requisitos de UX

### 4.1 Agenda (a tela mais usada do produto)

- Grade de colunas por profissional (ou por cadeira, alternável), linhas de 10/15/30 min conforme configuração.
- Cores por status: Solicitado (cinza tracejado), Agendado (azul), Confirmado (verde), Atendendo (roxo), Atendido (verde escuro), Faltou (vermelho), Cancelado (riscado/oculto por filtro).
- Interações: clicar em slot livre → modal de agendamento; arrastar/soltar para reagendar; redimensionar para mudar duração; clique direito → ações rápidas (confirmar, faltou, iniciar atendimento, WhatsApp).
- **Mutação otimista** em drag & drop, com rollback e toast em caso de `409`.
- Atualização em tempo real via SSE (outra recepcionista agendando aparece sem F5).
- Atalhos de teclado: `n` novo, `←/→` dia, `t` hoje, `/` busca, `Esc` fecha.
- Desempenho: virtualização vertical; alvo de 60 fps com 200 agendamentos no dia.
- Painel lateral opcional: fila de espera com botão "oferecer este horário".

### 4.2 Atendimento (foco do dentista)

Layout de três áreas em uma única rota (sem navegação entre telas durante o atendimento):

```
┌───────────────────────────────────────────────────────────────┐
│ Paciente: Ana Souza · 34a · ⚠ Alergia a penicilina            │
├──────────────────┬────────────────────────────────────────────┤
│ Odontograma      │ Plano de tratamento (itens planejados)     │
│ (SVG interativo) │ [ ] Restauração 26 O   R$ 320  [Executar]  │
│                  │ [x] Profilaxia         R$ 150  Executado   │
│                  ├────────────────────────────────────────────┤
│                  │ Evolução (editor + templates de texto)     │
│                  │ [Salvar e assinar]                         │
├──────────────────┴────────────────────────────────────────────┤
│ Histórico: evoluções anteriores · anexos · orçamentos          │
└───────────────────────────────────────────────────────────────┘
```

- Alertas clínicos (alergias, condições) sempre visíveis no topo, em vermelho, não dispensáveis.
- Odontograma sem lib: permanente = arte FDI de referência + overlay de faces `M|D|V|L|O|C`; decídua = glifos SVG. Legenda de condições e histórico no FormDialog. Detalhe: [frontend/odontograma.md](./frontend/odontograma.md).
- Editor de evolução com templates/atalhos por procedimento e contador de caracteres; autosave em rascunho local até assinar.
- Ao assinar: banner de imutabilidade ("esta evolução não pode ser editada; correções geram nova versão").

### 4.3 Inbox WhatsApp

- Três colunas: lista de conversas (não lidas / PENDING em destaque) · thread · painel do paciente (nome, próximo agendamento, link da ficha).
- **Sem bloqueio de janela Meta 24h** (ADR-0016 / WAHA): a UI não impede envio por “janela fechada”. Indicador “última mensagem há X” é opcional (UX), não regra de negócio.
- Envio de texto (e mídia via presign) na thread; templates/automations ficam em `/app/whatsapp` (conta/QR).
- Marcação de “resolvido” (status CLOSED); atribuição a atendente quando exposto na UI.
- Ações contextuais (Should RF-E8-10): navegar para agendar / orçamento / anamnese / recibo com `patientId` — não reimplementar fluxos no thread.

### 4.4 Autoagendamento público

- Página SSR leve (LCP < 2,5 s em 4G), mobile-first, com nome/logo da clínica.
- Passos: serviço → profissional (opcional) → data/hora → identificação → OTP → confirmação.
- Só exibe horários realmente disponíveis (recalculados no submit para evitar corrida).
- Consentimento LGPD explícito antes de enviar dados.

### 4.5 Financeiro

- Contas a receber com filtros salvos (vencendo hoje, em atraso, do paciente X).
- Baixa em modal, sem sair da lista; múltiplas formas de pagamento em um recebimento.
- Caixa do dia com conferência por forma de pagamento e destaque de divergência.
- Fluxo de caixa com alternância competência/caixa e exportação.

### 4.6 Dashboard, relatórios e assinatura

- `/app`: cards do dia (agenda, a receber/recebido se `reports.financial`, faltas, produção) com drill-down.
- `/app/relatorios`: índice + exportação CSV assíncrona (solicita job e oferece Baixar / copiar URL quando pronto). XLSX fora do MVP.
- Rotas E7 (`cash-flow`, `overdue`, `production`) reaparecem sob `/app/relatorios/*` reusando as telas do package `financeiro`.
- Dentista: produção própria ok; sem receita/fluxo/inadimplência consolidados.
- `/app/assinatura` → `/app/configuracoes/assinatura` (`subscription.manage`): cartão do plano (status com ícone, próxima cobrança, forma de pagamento), uso vs limite, faturas, CTA único por estado (Assinar / Reativar / Pagar fatura em aberto) e cancelamento com confirmação ([ADR-0017](./adr/0017-billing-saas-asaas.md)).
- `/app/assinatura/checkout` (`subscription.manage`): plano (3 colunas) → forma de pagamento (Pix, cartão, boleto) → CPF/CNPJ + resumo fixo. Pix/boleto na própria página (QR Code/linha digitável) com confirmação por polling; cartão redireciona ao Asaas Checkout (nenhum dado de cartão no app).
- `/app/assinatura/retorno?status=success|cancel|expired`: retorno do Asaas; **nunca** confirma o pagamento (só o webhook ativa a assinatura).
- `/app/auditoria` (`audit.read`): Index da trilha (filtros paciente/ator/ação/período; empty/403). Deep-link `?patientId=` a partir da ficha (“Ver acessos”). Sem edição. DENTIST/RECEPTION sem item de nav.
- `/app/privacidade` (`data.export`): exportação completa da clínica (poll + Baixar ZIP / copiar URL; copy de confidencialidade) e solicitações do titular (FormDialog paciente/tipo; pacote ACCESS quando pronto; banner se `dueAt` < 3 dias). DENTIST/RECEPTION sem item de nav.
- Banner global se trial ≤ 3 dias, atraso ou suspensão (OWNER). SUSPENDED/EXPIRED: UI de somente leitura; listagens e export seguem.

## 5. Padrões de implementação

### Data → Service → Hook (Patient)

```ts
// data/Patient/PatientListData.ts
export async function PatientListData(query: PatientListQuery) {
  return apiClient.request('/patients', { method: 'GET', query });
}

// services/Patient/PatientListService.ts
export async function PatientListService(query: PatientListQuery) {
  return PatientListData(query);
}

// hooks/Patient/usePatientListHook.ts
export function usePatientListHook(query: PatientListQuery) {
  return useQuery({
    queryKey: ['patients', 'list', query],
    queryFn: () => PatientListService(query),
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });
}

// hooks/Patient/usePatientCreateHook.ts
export function usePatientCreateHook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: PatientCreateService,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['patients'] }),
  });
}
```

Agenda (mutação otimista) segue o mesmo padrão — Data/Service/Hook por ação (`AppointmentUpdateData`, `useAppointmentUpdateHook`), com `onMutate` / rollback no hook.

### Permissões na UI

```tsx
// shared/auth/permissions.ts + componente Can
<Can permission="clinical_records.write" fallback={null}>
  <Button onClick={openNoteEditor}>Registrar evolução</Button>
</Can>
```

Esconder na UI é **conveniência**, nunca segurança — o servidor sempre reavalia.

### Server Components vs Client Components

- RSC (padrão): páginas públicas, listagens estáticas, relatórios, layouts.
- Client Components: agenda, odontograma, inbox, formulários — tudo que é interativo.
- Nunca passar token do usuário para RSC via props; chamadas autenticadas server-side usam o cookie.

## 6. Design system (`shared/ui`)

Componentes previstos no MVP: `Button`, `Input`, `Select`, `Combobox` (busca de paciente), `DatePicker`, `TimePicker`, `Modal`, `Drawer`, `Tabs`, `Table`, `Badge`, `StatusPill`, `Avatar`, `Tooltip`, `Toast`, `EmptyState`, `Skeleton`, `MoneyInput`, `CpfInput`, `PhoneInput`, `Odontogram`, `AgendaGrid`, `Timeline`.

Tokens: cores (com paleta semântica de status da agenda), espaçamento 4px-base, tipografia, raio, sombra, z-index. Tema claro no MVP; escuro na fase 2 (tokens já preparados).

## 7. Acessibilidade e i18n

- Navegação completa por teclado na agenda e no prontuário; foco visível; `aria-live` em toasts.
- Odontograma acessível: cada dente é um `button` com `aria-label` ("dente 26, face oclusal, restaurado").
- Contraste mínimo AA; status nunca comunicado **só** por cor (ícone + texto).
- Textos em `pt-BR` centralizados em arquivo de mensagens desde o início (facilita futura tradução), formatação com `Intl.NumberFormat`/`Intl.DateTimeFormat`.
- Timezone do tenant aplicado na renderização; nunca `new Date()` sem fuso explícito em cálculo de agenda.

## 8. Performance

| Meta | Como |
| --- | --- |
| LCP < 2,5 s nas páginas públicas | RSC + imagens otimizadas + CSS crítico |
| TTI < 3 s na agenda | Code splitting por rota, virtualização, sem bibliotecas de gráfico na rota da agenda |
| Bundle inicial da área autenticada < 250 KB gzip | Import dinâmico de odontograma, gráficos e editor |
| Sem layout shift | Skeletons com dimensões fixas |
| Offline tolerante | PWA com cache de shell; escrita exige rede (fila local é risco em dado clínico — fora do MVP) |

## 9. Tratamento de erros e estados vazios

- Todo estado de lista tem: carregando (skeleton), vazio (com ação primária), erro (com "tentar novamente") e sem permissão.
- Erros de rede: toast persistente com retry; a agenda mostra tarja "dados podem estar desatualizados" quando o SSE cai.
- Nunca exibir mensagem técnica bruta ao usuário; `requestId` fica disponível em "detalhes" para suporte.
