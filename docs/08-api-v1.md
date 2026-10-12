# 08 — API v1

## 1. Convenções

| Tema | Regra |
| --- | --- |
| Base | `https://api.{dominio}/api/v1` |
| Versionamento | Prefixo de URL (`/api/v1`) — ver [ADR-0003](./adr/0003-versionamento-api.md) |
| Formato | JSON `application/json; charset=utf-8`; `snake_case` nunca — usamos `camelCase` no payload |
| Datas | ISO 8601 com offset (`2026-08-14T13:30:00-03:00`); servidor persiste em UTC |
| Dinheiro | Inteiro em centavos, sufixo `Cents` (`totalCents: 25000`) |
| IDs | UUID v7 em string |
| Envelope | Sucesso: `{ "data": ... }` (+ `"meta"` em listas). Erro: `{ "error": { ... } }` |
| Paginação | Cursor: `?limit=50&cursor=<opaco>`; `limit` máx. 100; resposta traz `meta.nextCursor` |
| Ordenação | `?sort=startsAt:asc,createdAt:desc` (campos permitidos por endpoint) |
| Filtros | Query params explícitos e tipados por Zod; nada de filtro genérico tipo `?where=` |
| Idempotência | `Idempotency-Key` obrigatório em POST que gera efeito financeiro ou envia mensagem |
| Autenticação | `Authorization: Bearer <accessToken>`; refresh por cookie httpOnly |
| Tenant | Derivado do token; `X-Tenant-Id` apenas para trocar entre memberships válidos |
| Correlação | `X-Request-Id` aceito e devolvido; propagado nos logs |
| Rate limit | Cabeçalhos `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset` |
| Depreciação | Cabeçalhos `Deprecation` e `Sunset` + aviso em `meta.warnings` |
| Documentação | OpenAPI 3.1 gerado dos schemas Zod, servido em `/api/v1/docs` |

### Estrutura da resposta

```json
{
  "data": { "id": "018f...", "status": "SCHEDULED" },
  "meta": { "requestId": "req_01J...", "nextCursor": null }
}
```

### Estrutura do erro

```json
{
  "error": {
    "code": "SLOT_UNAVAILABLE",
    "message": "Este horário já está ocupado para o profissional selecionado.",
    "details": [
      { "field": "startsAt", "issue": "conflict", "conflictingAppointmentId": "018f..." }
    ],
    "requestId": "req_01J..."
  }
}
```

`code` é estável e é o contrato para o frontend; `message` é texto para humano em pt-BR e pode mudar.

### Catálogo de códigos de erro

| HTTP | `code` | Quando |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Falha de schema (Zod) |
| 401 | `UNAUTHENTICATED` | Token ausente/expirado/inválido |
| 403 | `FORBIDDEN` | Papel sem permissão para o recurso |
| 403 | `TENANT_NOT_ALLOWED` | `X-Tenant-Id` fora dos memberships |
| 404 | `NOT_FOUND` | Recurso inexistente **ou** de outro tenant (não revelamos existência) |
| 409 | `SLOT_UNAVAILABLE` | Conflito de agenda |
| 409 | `DUPLICATE_RESOURCE` | Unicidade violada (CPF, código de procedimento) |
| 409 | `SELF_APPROVAL_FORBIDDEN` | Operador tenta aprovar o próprio break-glass |
| 422 | `REASON_TOO_SHORT` | Motivo de break-glass com menos de 20 caracteres |
| 422 | `GRANT_WINDOW_INVALID` | Janela de break-glass ≤ 0 h ou > 4 h |
| 422 | `BUSINESS_RULE_VIOLATION` | Regra de domínio (ex.: parcelas ≠ total) |
| 402 | `SUBSCRIPTION_REQUIRED` | Assinatura expirada/suspensa |
| 402 | `PLAN_LIMIT_EXCEEDED` | Limite do plano (profissionais, storage, mensagens) |
| 423 | `RECORD_IMMUTABLE` | Tentativa de alterar evolução/caixa fechado |
| 429 | `RATE_LIMITED` | Excesso de requisições |
| 500 | `INTERNAL_ERROR` | Falha inesperada (sem detalhes vazados) |
| 503 | `PROVIDER_UNAVAILABLE` | WhatsApp/storage/e-mail indisponível |
| 503 | — | `GET /ready` com dependência down: `{ data: { db, redis, storage } }` **sem** `error.code` e **sem** connection string |

## 2. Mapa de endpoints do MVP

### 2.1 Autenticação e identidade (`identity`)

```
POST   /api/v1/auth/signup                 cria tenant + owner
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh                rotação de refresh token (cookie)
POST   /api/v1/auth/logout
POST   /api/v1/auth/logout-all
POST   /api/v1/auth/password/forgot
POST   /api/v1/auth/password/reset
GET    /api/v1/auth/me                     usuário + memberships + permissões efetivas
POST   /api/v1/auth/switch-tenant

GET    /api/v1/users                       membros do tenant
POST   /api/v1/users/invitations           convidar membro
GET    /api/v1/users/invitations
DELETE /api/v1/users/invitations/:id
POST   /api/v1/users/invitations/accept    público (token)
PATCH  /api/v1/users/:id                   papel, unidade padrão, ativo/inativo
```

### 2.2 Clínica e configurações (`clinic`)

```
GET    /api/v1/clinic                      dados do tenant
PATCH  /api/v1/clinic
GET    /api/v1/clinic/units
POST   /api/v1/clinic/units
PATCH  /api/v1/clinic/units/:id
GET    /api/v1/clinic/units/:id/chairs
POST   /api/v1/clinic/units/:id/chairs
PATCH  /api/v1/clinic/units/:id/chairs/:chairId
GET    /api/v1/clinic/business-hours       ?unitId=&professionalId=
PUT    /api/v1/clinic/business-hours       substitui a grade semanal (weekday ISO 1=Mon…7=Sun)
POST   /api/v1/clinic/business-hours/exceptions  body → data inclui `conflicts[]` (não cancela agendamentos)
GET    /api/v1/clinic/professionals
POST   /api/v1/clinic/professionals
PATCH  /api/v1/clinic/professionals/:id
GET    /api/v1/procedures                  ?search=&specialty=&active=
POST   /api/v1/procedures
PATCH  /api/v1/procedures/:id
POST   /api/v1/procedures/import-catalog   importa catálogo sugerido
```

**GET `/clinic`**, **GET `/clinic/professionals`**, **GET `/clinic/units/:id/chairs`**: `settings.read` **ou** `agenda.read` (catálogo operacional da agenda — dentista/recepção/ASB). Escrita (`POST`/`PATCH`) permanece `settings.write`. Resposta de `GET`/`PATCH /clinic` inclui `chairsEnabled` (default `false`): quando desligado, a UI omite visão/cadastro de cadeiras e `POST`/`PATCH` de cadeiras retorna `FEATURE_DISABLED`.

**GET `/procedures`**: `settings.read` **ou** `quotes.read` **ou** `quotes.write` (montagem de orçamento pela recepção/dentista). Mutações do catálogo (`POST`/`PATCH`/`import-catalog`) permanecem `settings.write`. ASB **não** lista o catálogo por esta rota (sem `quotes.*`).

### 2.3 Pacientes (`patients`)

```
GET    /api/v1/patients                    ?search=&cursor=&limit=&active=
POST   /api/v1/patients
GET    /api/v1/patients/:id
PATCH  /api/v1/patients/:id
DELETE /api/v1/patients/:id                inativação (soft delete); ?confirmFutureAppointments=true se houver agenda futura
GET    /api/v1/patients/:id/timeline       consultas, evoluções, orçamentos, pagamentos, mensagens
GET    /api/v1/patients/:id/consents
POST   /api/v1/patients/:id/consents       grant ou revoke (`granted: false`)
POST   /api/v1/patients/:id/guardians
GET    /api/v1/patients/check-duplicate    ?cpf=&phone=
```

### 2.4 Agenda (`scheduling`)

```
GET    /api/v1/appointments                ?unitId=&from=&to=&professionalId=&chairId=&status=
POST   /api/v1/appointments
GET    /api/v1/appointments/:id
PATCH  /api/v1/appointments/:id            reagendar / trocar profissional / notas
POST   /api/v1/appointments/:id/status     { status, reason? }  // IN_SERVICE → outbox `scheduling.appointment_started`
DELETE /api/v1/appointments/:id            cancelamento (com motivo)
GET    /api/v1/appointments/:id/history

GET    /api/v1/availability                ?professionalId=&date=&procedureId=  slots livres
POST   /api/v1/schedule-blocks
DELETE /api/v1/schedule-blocks/:id
POST   /api/v1/appointment-series           compromisso recorrente
DELETE /api/v1/appointment-series/:id       ?scope=THIS|FUTURE|ALL

GET    /api/v1/waitlist
POST   /api/v1/waitlist
DELETE /api/v1/waitlist/:id
POST   /api/v1/waitlist/:id/offer           oferta manual de vaga
```

Rotas públicas (sem autenticação de usuário, com rate limit agressivo):

```
GET    /api/v1/public/clinics/:slug                    dados públicos + serviços
GET    /api/v1/public/clinics/:slug/availability       ?procedureId=&professionalId=&from=&to=
POST   /api/v1/public/clinics/:slug/bookings           solicita OTP
POST   /api/v1/public/clinics/:slug/bookings/verify    confirma com OTP → cria agendamento
GET    /api/v1/public/appointments/:token/confirm      confirmação por link
GET    /api/v1/public/anamnesis/:token                 (S4)
POST   /api/v1/public/anamnesis/:token                 (S4)
GET    /api/v1/public/quotes/:token                    (S5)
POST   /api/v1/public/quotes/:token/decision           (S5; Idempotency-Key)
POST   /api/v1/public/waitlist/:token/accept           (S3 Bloco 3)
```

**GET `/public/clinics/:slug`** — só procedimentos `publicly_bookable` e profissionais ativos. Sem preço, CRO ou telefone interno. Slug inválido → `404 NOT_FOUND`.

```json
{
  "data": {
    "name": "Clínica Teste",
    "slug": "clinica-teste-xxxxxxxx",
    "timezone": "America/Sao_Paulo",
    "procedures": [{ "id": "…", "name": "Consulta", "defaultMinutes": 30 }],
    "professionals": [{ "id": "…", "name": "Dra. Ana Souza" }]
  }
}
```

**POST `/public/clinics/:slug/bookings`**

```json
{
  "procedureId": "…",
  "professionalId": "…",
  "startsAt": "2026-08-20T14:00:00-03:00",
  "name": "João Paciente",
  "phone": "62999990000",
  "email": "joao@example.com",
  "consentDataProcessing": true,
  "consentTerms": true,
  "consentWhatsappMarketing": false
}
```

Resposta: `{ "data": { "bookingId": "…", "otpSentVia": "EMAIL"|"WHATSAPP", "expiresInSeconds": 300 } }`.  
Erros: `409 SLOT_UNAVAILABLE`, `422 BUSINESS_RULE_VIOLATION` (lead time / procedimento não público / consentimento obrigatório / e-mail ausente sem WhatsApp conectado), `429 RATE_LIMITED`.

**POST `.../bookings/verify`:** `{ "bookingId", "code": "123456" }` → appointment (`origin=PUBLIC_BOOKING`) + patient. OTP 6 dígitos, 5 min, 3 tentativas. Sem sessão WA `CONNECTED`, OTP vai por e-mail.

**GET `/public/appointments/:token/confirm`:** one-shot; segunda chamada → `200` com status atual. `REQUESTED` ou cancelado → `409 INVALID_STATE_TRANSITION`. Só `SCHEDULED → CONFIRMED`.

**Waitlist autenticado (`agenda.write`):**

```
GET    /api/v1/waitlist?status=&professionalId=&procedureId=
POST   /api/v1/waitlist
DELETE /api/v1/waitlist/:id
POST   /api/v1/waitlist/:id/offer
```

**POST `/waitlist`**

```json
{
  "patientId": "…",
  "professionalId": null,
  "procedureId": "…",
  "preferredPeriods": [{ "weekday": 1, "from": "08:00", "to": "12:00" }],
  "priority": 0
}
```

`priority`: `0` NORMAL, `1` URGENT. `professionalId` omitido/null = qualquer profissional. `preferredPeriods` vazio = qualquer horário. Weekday ISO 1–7.

**POST `/waitlist/:id/offer`** (`Idempotency-Key` opcional): `{ "appointmentId": "<CANCELLED|NO_SHOW>" }` → marca `OFFERED`, token 30 min, outbox `scheduling.waitlist_offer_sent` com `template=waitlist_offer` e `buttonPayload=WAITLIST_<offerId>`. Em `NODE_ENV=test` a resposta inclui `acceptToken`.

**POST `/public/waitlist/:token/accept`:** first-accept-wins (EXCLUDE). Vencedor → appointment `origin=WAITLIST` `SCHEDULED`. Perdedor → `409 SLOT_UNAVAILABLE` + entrada `EXPIRED`. Segunda chamada no mesmo token → `200` idempotente.

### 2.5 Prontuário (`clinical-records`)

Permissões: `clinical_records.read` / `.write` (S1). Recepção → `403 FORBIDDEN` + `audit_log PERMISSION_DENIED`. GETs clínicos passam por `auditRead` (`action=READ`, `patient_id`). Envelope `{ data }` / `{ error }`; camelCase.

```
GET    /api/v1/patients/:patientId/record              cabeçalho + alertas
GET    /api/v1/patients/:patientId/record/odontogram   ?dentition=PERMANENT|DECIDUOUS&at=
PUT    /api/v1/patients/:patientId/record/odontogram/teeth/:toothCode
GET    /api/v1/patients/:patientId/record/notes        ?cursor=&limit=
POST   /api/v1/patients/:patientId/record/notes        cria evolução (imutável)
POST   /api/v1/patients/:patientId/record/notes/:id/amend   nova versão com motivo
PATCH  /api/v1/patients/:patientId/record/notes/:id     → 423 RECORD_IMMUTABLE
DELETE /api/v1/patients/:patientId/record/notes/:id     → 423 RECORD_IMMUTABLE
GET    /api/v1/patients/:patientId/record/anamnesis
POST   /api/v1/patients/:patientId/record/anamnesis
POST   /api/v1/patients/:patientId/record/anamnesis/send-link
GET    /api/v1/patients/:patientId/record/alerts
POST   /api/v1/patients/:patientId/record/alerts
PATCH  /api/v1/patients/:patientId/record/alerts/:id    { active }  // não-CRITICAL
GET    /api/v1/patients/:patientId/attachments          ?category=
POST   /api/v1/patients/:patientId/attachments/presign
POST   /api/v1/patients/:patientId/attachments          confirma upload (metadados)
GET    /api/v1/attachments/:id/download
DELETE /api/v1/attachments/:id                          { reason }
GET    /api/v1/anamnesis-forms
POST   /api/v1/anamnesis-forms                          // settings.write (nova versão)
```

**GET `/patients/:patientId/record`** (`clinical_records.read`):

```json
{
  "data": {
    "patientId": "…",
    "medicalRecordId": "…",
    "openedAt": "2026-08-13T15:00:00.000Z",
    "anamnesisStale": true,
    "lastAnamnesisAt": null,
    "alerts": [
      { "id": "…", "severity": "CRITICAL", "category": "ALLERGY", "description": "Alergia a dipirona", "source": "ANAMNESIS", "active": true }
    ]
  }
}
```

`anamnesisStale=true` se última resposta > 12 meses ou inexistente (RF-E5-18). Paciente sem prontuário → `404 NOT_FOUND` (1:1 criado no `patient` create). Alertas `CRITICAL` vêm primeiro.

**GET `/anamnesis-forms`** (`clinical_records.read` **ou** `settings.read`): `{ "items": [{ "id", "name", "version", "active", "questions", "createdAt" }] }`. POST (`settings.write`) cria **nova versão** (`version+1`, `active` só na última): `{ "name", "questions" }`.

**GET `/patients/:patientId/record/anamnesis`** (`clinical_records.read` + `auditRead`): histórico com `questions` da **versão respondida** + `answers` decifrados. POST (`.write`, `answered_by=PROFESSIONAL`): `{ "answers": { "allergy_meds": { "value": true, "text": "Dipirona" }, "main_complaint": "Dor no 26" } }` → `{ "id", "accepted": true }`. `alertWhen` satisfeito gera `ClinicalAlert` (`source=ANAMNESIS`); CRITICAL publica outbox `clinical_records.critical_alert_created` (emit-only).

**POST `.../anamnesis/send-link`** (`.write`): `{ "channel": "WHATSAPP"|"EMAIL"|"COPY" }` → `{ "expiresAt", "sentVia", "publicUrl"? }`. Token `purpose=ANAMNESIS`, TTL 7 dias, one-shot. WA se conta `CONNECTED` (texto `anamnesis_request`); senão e-mail; `COPY` devolve URL absoluta `APP_PUBLIC_URL/anamnese/{token}`. Não logar token plaintext no `audit_log`.

**GET|POST `/public/anamnesis/:token`** (sem JWT, sem slug; rate `public:anamnesis:ip:{ip}` 30/h): GET → `{ clinicName, patientFirstName, form: { name, version, questions }, expiresAt }` (sem CPF/telefone/CRO/alertas). Token usado/expirado/inexistente → `404 NOT_FOUND` (mesmo shape). POST `{ answers }` → `{ accepted: true }` (200); idempotente se `used_at` já setado; `answered_by=PATIENT` + signature SIMPLE `{ ip, userAgent, hash }`. Validação contra a versão do form no token. `showWhen.patientGender` filtra perguntas.

**GET `/patients/:patientId/record/alerts`** (`.read` + `auditRead`): `{ "items": [...] }` filtrável `?severity=&category=&active=`. POST (`.write`, `source=MANUAL`): `{ "severity", "category", "description" }`. PATCH `{ "active" }` — `CRITICAL` não dispensável → `422 BUSINESS_RULE_VIOLATION`.

**GET `/patients/:patientId/record/odontogram`** (`.read` + `auditRead`): query obrigatória `dentition=PERMANENT|DECIDUOUS`; opcional `at` (ISO) reconstruindo o estado a partir de `tooth_state_history` até a data.

```json
{
  "data": {
    "patientId": "…",
    "medicalRecordId": "…",
    "dentition": "PERMANENT",
    "at": null,
    "teeth": [
      {
        "toothCode": "26",
        "face": "O",
        "condition": "CARIES",
        "notes": null,
        "recordedAt": "2026-08-13T18:00:00.000Z",
        "recordedBy": "…",
        "history": [
          { "at": "2026-08-13T18:00:00.000Z", "fromCondition": null, "toCondition": "CARIES", "source": "MANUAL" }
        ]
      }
    ]
  }
}
```

Com `at`, `history` é omitido e `notes` vem `null` (não versionado). Dente sem evento até a data não aparece. Sem registros → `teeth: []`. Paciente sem prontuário → `404`.

**PUT `.../odontogram/teeth/:toothCode`** (`.write`): `{ "dentition", "face"?, "condition", "notes"?, "justification"? }`. Sem `face` = dente inteiro. Grava `tooth_state` + `tooth_state_history` (`source=MANUAL`) e outbox `clinical_records.odontogram_updated` (emit-only). FDI inválido → `422 BUSINESS_RULE_VIOLATION`. `ABSENT`/`EXTRACTED` + `RESTORED` → `422 TOOTH_STATE_CONFLICT`; `justification` ≥10 caracteres força. PUT idêntico (mesma condição/notas) é idempotente (sem history/outbox).

**GET `.../notes?cursor=&limit=`** (`.read`, `auditRead`): lista evoluções do prontuário (todas as versões, mais recente primeiro). Envelope `{ "data": { "items", "nextCursor" } }`. Cada item traz `content` decifrado, `procedures`, `version`, `supersedesId`, `amendReason`, `contentHash` (`sha256:<hex>`), `signature`, `signedAt`, `appointmentId`, `professionalId`. Sem prontuário → `404`.

**POST `.../notes`** (`.write`): `{ "content", "appointmentId"?, "procedures"?, "treatmentItemIds"? }`. `content.trim()` ≥10. `procedures[]`: `{ "procedureId", "toothCode"|"tooth"?, "face"? }`. `treatmentItemIds` presente → `422 BUSINESS_RULE_VIOLATION` com hint `POST /api/v1/treatment-items/:id/execute` (execução do plano não é atalho deste POST). Profissional do membership deve ter `croNumber` (OWNER sem CRO → `422 BUSINESS_RULE_VIOLATION`). `appointmentId` opcional: se `SCHEDULED`/`CONFIRMED`, transiciona para `IN_SERVICE` e publica `scheduling.appointment_started`; se `IN_SERVICE`/`COMPLETED`, só vincula; outro status → `422`. Outbox `clinical_records.note_created` (emit-only). `content` cifrado (envelope); `content_hash` plaintext. ASB/recepção → `403`.

**POST `.../notes/:id/amend`** (`.write`): `{ "content", "reason" }` — ambos ≥10 após trim. Nova linha `version+1`, `supersedesId`, `amendReason`. Outbox `clinical_records.note_amended`.

**PATCH/DELETE `.../notes/:id`:** `423 RECORD_IMMUTABLE` + hint `/amend`. Trigger PG recusa `UPDATE`/`DELETE` na tabela.

**GET `.../attachments?category=`** (`.read`, `auditRead`): lista anexos ativos. Envelope `{ "data": { "items" } }`.

**POST `.../attachments/presign`** (`.read` — ASB pode anexar): `{ "fileName", "mimeType", "sizeBytes", "category" }`. Valida MIME (`image/jpeg|png|webp`, `application/pdf`), tamanho ≤20 MB e cota do tenant (`ATTACHMENT_QUOTA_BYTES`, default 1 GB) **antes** de emitir URL. MIME inválido → `415 UNSUPPORTED_MEDIA_TYPE`. Tamanho → `422`. Cota → `402 PLAN_LIMIT_EXCEEDED`. Storage down → `503 STORAGE_UNAVAILABLE`. Resposta: `{ uploadUrl, method: "PUT", headers, storageKey, expiresIn: 900 }`.

**POST `.../attachments`** (`.read`): confirma upload `{ "storageKey", "checksumSha256", "fileName", "mimeType", "sizeBytes", "category", "clinicalNoteId"? }`. Exige objeto no storage. Idempotente por `storageKey`. Outbox `clinical_records.attachment_created` → job thumbnail (JPEG/PNG/WEBP; original intocado).

**GET `/api/v1/attachments/:id/download`** (`.read`): `{ "downloadUrl", "expiresIn": 900 }` + `audit_log` com `patient_id`. Outro tenant → `404`. Excluído → `404`.

**DELETE `/api/v1/attachments/:id`** (`.write`): `{ "reason" }` ≥10. Exclusão lógica (`deletedAt` + motivo + autor); arquivo permanece no storage. ASB → `403`.

`toothStates` / `treatmentItemIds` / side-effects de odontograma e execução → S5.

### 2.6 Orçamentos e tratamentos (`treatments`)

HTTP autenticado do **CRUD** entra no **S5 Bloco 2**. **Send/PDF/token/expire/duplicate** no **Bloco 3**. Decisão, plano e execute ficam nos Blocos 4–5. Fundação (Bloco 1): tabelas + RLS + `treatments_public` / `billing_public.createReceivableFromApprovedQuote`. Sem `GET /receivables` (E7 → S6).

```
GET    /api/v1/quotes                      ?patientId=&status=&from=&to=
POST   /api/v1/quotes
GET    /api/v1/quotes/:id
PATCH  /api/v1/quotes/:id                  só em DRAFT
POST   /api/v1/quotes/:id/items
DELETE /api/v1/quotes/:id/items/:itemId
POST   /api/v1/quotes/:id/send              e-mail/WhatsApp + link
POST   /api/v1/quotes/:id/duplicate
POST   /api/v1/quotes/:id/decision          Idempotency-Key obrigatório
GET    /api/v1/quotes/:id/pdf

GET    /api/v1/treatment-plans              ?patientId=&status=
GET    /api/v1/treatment-plans/:id
POST   /api/v1/treatment-items/:id/execute  { appointmentId?, note, toothState? }
POST   /api/v1/treatment-items/execute      { itemIds, note, appointmentId?, toothStates? }
POST   /api/v1/treatment-items/:id/cancel

GET    /api/v1/public/quotes/:token
POST   /api/v1/public/quotes/:token/decision
```

Público: rate limit `public:quotes:ip:{ip}` 30/h. GET sem PII/clínico. Decisão: mesmo shape autenticado §3.4. Autenticado: `quotes.write` no CRUD/send/**decision presencial** (recepção incluída). `quotes.approve` existe na matriz de papéis mas **não** é o gate HTTP deste POST nesta sprint. FINANCE/ASB 403.

**Bloco 2 (vivo):** `GET|POST|PATCH /quotes` e items. Totais só no servidor. `unit_price_cents` copiado do catálogo no create/add item — alteração posterior de `procedure.price_cents` **não** altera item existente. `requiresTooth` sem `toothCode` / `requiresFace` sem `face` → `422`. Teto de desconto (bruto unit×qtd + descontos de item + header): RECEPTION 0%, DENTIST 10%, OWNER ilimitado → `422 DISCOUNT_LIMIT_EXCEEDED`. PATCH fora de `DRAFT` → `409 INVALID_STATE_TRANSITION`. Create publica outbox `treatments.quote_created`.

```http
POST /api/v1/quotes
{
  "patientId": "018f5c2b-...",
  "professionalId": "018f5c40-...",
  "unitId": "018f5c10-...",
  "validUntil": "2026-09-12",
  "notes": "Proposta de restauração",
  "discountCents": 0,
  "items": [
    { "procedureId": "018f5c55-...", "toothCode": "26", "face": "O", "quantity": 1, "discountCents": 0 }
  ]
}
```

`unitId` omitido → unidade do paciente. `validUntil` omitido → hoje (TZ do tenant) + 30 dias. Envelope GET: `{ data }` com itens e totais em centavos `number`. Lista: `{ data: [...], meta: { nextCursor } }`.

**Bloco 3 (vivo):** `POST /quotes/:id/send` `{ channel: WHATSAPP|EMAIL|COPY }` — `DRAFT`→`SENT`, token `purpose=QUOTE` (reuso da URL vigente), outbox `treatments.quote_sent` → job PDF + WA se canal WHATSAPP. Sem WA/e-mail → fallback COPY (devolve `publicUrl`). `GET /quotes/:id/pdf` URL assinada 15 min; sem arquivo → `409 PDF_PENDING`. `POST /quotes/:id/duplicate` a partir de `SENT|EXPIRED|REJECTED|PARTIALLY_APPROVED` com preços **atuais** do catálogo + `duplicated_from_id`. Job `expire-quotes` (fila `platform`, cron por tenant TZ) marca `SENT` vencido → `EXPIRED` (outbox `quote_expired`). Template `quote_sent` (utility: nome, clínica, valor, URL). PDF comercial sem diagnóstico (pdfkit).

**Bloco 4 (vivo):** `POST /quotes/:id/decision` com `Idempotency-Key` obrigatório (`quotes.write` — recepção **pode** registrar decisão presencial; `quotes.approve` não é exigido neste endpoint nesta sprint, desvio vs. papel “approve” na matriz de permissões). Aprovação total/parcial na mesma TX: plano ACTIVE + `billing_public.createReceivableFromApprovedQuote` + parcelas; falha no billing faz rollback (orçamento permanece `SENT`, zero planos). Mesma chave + mesmo desfecho → resposta original; mesma chave + corpo diferente → `409 IDEMPOTENCY_KEY_REUSED`. Só `SENT` (e `validUntil` vigente) aceita decisão. Rejeição: `reason` ≥10, sem plano/título. `GET /quotes/:id` inclui `receivable` após aprovado.

Público: `GET /api/v1/public/quotes/:token` (comercial: clínica, primeiro nome, itens, totais, validade; `requiresGuardian`) e `POST /api/v1/public/quotes/:token/decision`. Rate `public:quotes:ip:{ip}` 30/h. Token usado/expirado → GET 404; POST replay com a mesma Idempotency-Key continua válido. Menor ou cadastro com responsável: `guardianCpf` conferindo um `legal_guardian`; menor sem responsável → `422 GUARDIAN_REQUIRED`. `decidedBy`: `USER` (autenticado) vs `PATIENT_LINK` (público). Outbox `treatments.quote_approved` / `quote_rejected` / `plan_created` (`emit-only`).

**Bloco 5 (vivo):** `GET /treatment-plans` + `/:id` (`quotes.read`) com `progressPercent` / `executedCents` / `pendingCents`. `POST /treatment-items/:id/execute` e `POST /treatment-items/execute` (`clinical_records.write`): note ≥10, CRO obrigatório, uma evolução assinada via `clinical_records_public.createSignedNote`, odontograma `source=PROCEDURE_EXECUTION` (mapa `RES→RESTORED` etc., override `toothState`), `billing_public.createProductionEntry`, outbox `item_executed` / `plan_completed`. Item `EXECUTED` de novo → `409 ITEM_ALREADY_EXECUTED`. Cancel só `PLANNED`/`SCHEDULED` (`reason` ≥10); executado → `422 ITEM_ALREADY_EXECUTED`. Plano: todos cancelados → `CANCELLED`; resto executado → `COMPLETED`. Recepção/ASB 403 no execute. Timeline `QUOTE` via `treatments_public` se `quotes.read`.

### 2.7 Financeiro (`billing`)

HTTP E7 (baixa, caixa, AP, fatia de relatórios) → **S6**. Fundação (Bloco 1): tabelas + RLS + counter de recibo + seed de categorias. Rotas de domínio nos Blocos 2–5. Relatórios E7 (`/reports/cash-flow|overdue|production`) são registrados em `billing.module.ts` (sem módulo `reporting` nesta sprint).

```
GET    /api/v1/receivables                      ?patientId=&status=&from=&to=&cursor=&limit=
POST   /api/v1/receivables                      título manual (quotes não)
GET    /api/v1/receivables/:id                  inclui installments[] + payments[]
POST   /api/v1/receivables/:id/cancel           { reason }  só sem pagamentos

GET    /api/v1/installments                     ?patientId=&status=&dueFrom=&dueTo=&cursor=&limit=
POST   /api/v1/installments/:id/payments        Idempotency-Key
POST   /api/v1/payments/:id/reverse             Idempotency-Key { reason }
GET    /api/v1/payments/:id/receipt
POST   /api/v1/payments/:id/send-receipt        { channel: WHATSAPP|EMAIL|COPY }
POST   /api/v1/installments/:id/charge          { channel: WHATSAPP|EMAIL|COPY }

GET    /api/v1/payables                         ?status=&dueFrom=&dueTo=
POST   /api/v1/payables
PATCH  /api/v1/payables/:id                     só OPEN
POST   /api/v1/payables/:id/pay                 Idempotency-Key

GET    /api/v1/cash-sessions/current            ?unitId=
POST   /api/v1/cash-sessions                    Idempotency-Key  abrir
GET    /api/v1/cash-sessions/:id
POST   /api/v1/cash-sessions/:id/close          Idempotency-Key  { countedByMethod, differenceReason? }
POST   /api/v1/cash-sessions/:id/movements      { kind: SUPPLY|WITHDRAWAL, amountCents, method, reason }

GET    /api/v1/financial-categories             ?kind=REVENUE|EXPENSE
POST   /api/v1/financial-categories

GET    /api/v1/patients/:id/credit              saldo derivado (finance.read)

GET    /api/v1/reports/cash-flow                ?from=&to=&basis=CASH|ACCRUAL&unitId=   reports.financial
GET    /api/v1/reports/overdue                  ?unitId=&professionalId=                 reports.financial
GET    /api/v1/reports/production               ?from=&to=&professionalId=               reports.read (escopo por papel)
```

`Idempotency-Key` obrigatório em `POST .../payments`, `POST .../reverse`, `POST /cash-sessions`, `POST .../close`, `POST .../pay`. Mesma chave + mesmo body → resposta original; body diferente → `409 IDEMPOTENCY_KEY_REUSED`.

Erros estáveis: `403 FORBIDDEN`, `404 NOT_FOUND`, `409 IDEMPOTENCY_KEY_REUSED`, `422 BUSINESS_RULE_VIOLATION` / `CASH_SESSION_REQUIRED` / `RECEIVABLE_HAS_PAYMENTS`, `423 RECORD_IMMUTABLE` (caixa fechado).

### 2.8 Mensageria (`messaging`)

```
GET    /api/v1/messaging/account
POST   /api/v1/messaging/account            { riskAccepted: true }  → cria sessão WAHA, devolve qr / pairingCode; status PENDING
GET    /api/v1/messaging/account/qr         poll enquanto PENDING (qr base64 / pairingCode)
PATCH  /api/v1/messaging/account            { killSwitch }
POST   /api/v1/messaging/account/test       Idempotency-Key
DELETE /api/v1/messaging/account            logout sessão WAHA + kill switch + disable automations

GET    /api/v1/messaging/templates
GET    /api/v1/messaging/automations
PATCH  /api/v1/messaging/automations/:key   { enabled?, config? }  keys: CONFIRMATION_D1|REMINDER_H3|WAITLIST_OFFER
GET    /api/v1/messaging/usage              sent / failed / flags (sem saldo Meta)
GET    /api/v1/messaging/logs               ?from=&to=&result=&cursor=&limit=  (sem body clínico)

GET    /api/v1/messaging/conversations           ?status=OPEN|PENDING|CLOSED&patientId=&q=&unread=&cursor=&limit=
GET    /api/v1/messaging/conversations/:id
GET    /api/v1/messaging/conversations/:id/messages  ?cursor=&limit=
POST   /api/v1/messaging/conversations/:id/messages  Idempotency-Key  { text?, mediaStorageKey? }
PATCH  /api/v1/messaging/conversations/:id           { assignedToUserId?, status?, patientId? }
POST   /api/v1/messaging/conversations/:id/read
POST   /api/v1/messaging/media/presign               { fileName, mimeType, sizeBytes }

GET    /api/v1/stream                           SSE (`messaging.read`) — `message_received` / `unread_updated`

POST   /api/v1/webhooks/whatsapp            público, HMAC do WAHA (raw body, 2 MB)
```

**E8a (conta):** Frontend **nunca** chama o WAHA. `WAHA_API_KEY` só no backend. Sem `accessToken` Meta no POST. Teste fake em `NODE_ENV=test|development`. **Não** debitar crédito no delivery. Marketing exige consentimento (`BLOCKED_NO_CONSENT`). Connect sem `riskAccepted` → 422.

**Account:** `PENDING` (QR) → `CONNECTED` (ou `ERROR` + `lastError`). Kill switch: `PATCH { killSwitch: true }` ou `DELETE`.

**Automations config (exemplo):** `{ "sendAtLocalTime": "12:00", "onlyForStatuses": ["SCHEDULED","CONFIRMED"], "templateKey": "appointment_confirmation" }`.

**Inbox (E8b — S7):** permissões `messaging.read` (list/get/messages/stream) e `messaging.write` (send/patch/read/presign). Envelope `{ data }` (+ `meta.nextCursor` nas listas). Filtros: `status`, `patientId` (histórico na ficha do paciente — RF-E8-09), busca `q` (telefone/nome do contato ou paciente), `unread=true|false`. Paginação cursor. Envio: **texto** e/ou **mídia** (`mediaStorageKey` após presign + PUT no storage). MIME allowlist: `image/jpeg|png|webp`, `application/pdf` (≤20 MB). WAHA: `sendImage` / `sendFile` com URL pré-assinada GET; provedor sem mídia (Cloud) → `501 NOT_IMPLEMENTED`. `Idempotency-Key` obrigatório no POST message; replay com mesmo payload (text+mediaKey) devolve a mesma mensagem; payload diferente → `409 IDEMPOTENCY_KEY_REUSED`. Paciente vinculado por telefone E.164 (`patients_public`) no inbound e no send se ainda null. Inbound incrementa `unreadCount` + outbox `messaging.message_received` + fan-out SSE; `POST …/read` zera e emite `unread_updated`. Sem janela Meta de preço (ADR-0016). Bloqueio de send em `SUSPENDED`/`EXPIRED` → Bloco 5 (`subscriptionGuard`). Fallback FE: polling 5–10s se SSE cair (hub in-memory — multi-instância exige Redis depois).

**POST `/messaging/media/presign`:** `{ fileName, mimeType, sizeBytes }` → `{ uploadUrl, method: "PUT", headers, storageKey, expiresIn: 900 }`. MIME inválido → `415`; tamanho → `422`; storage down → `503 STORAGE_UNAVAILABLE`.

**GET `/stream` (SSE):** eventos `ready`, `message_received` (`conversationId`, `messageId`, `unreadCount`), `unread_updated` (`conversationId`, `unreadCount`); keep-alive `: ping` ~25s.

**Conversation (resumo):** `{ id, whatsappAccountId, patientId, contactPhone, contactName, status, assignedToUserId, unreadCount, lastMessageAt, serviceWindowExpiresAt, createdAt }`.

**Message (inbox):** `{ id, conversationId, direction, type, body, mediaKey, status, sentBy, createdAt }`.

### 2.9 Relatórios (`reporting`)

S6: `cash-flow` / `overdue` / `production` permanecem no módulo **`billing`** (paths estáveis).  
S7 Bloco 3: `dashboard` / `no-shows` / `revenue` / `procedures` no BC **`reporting`**. Export assíncrono → Bloco 4.

```
GET    /api/v1/reports/dashboard            ?unitId=&date=          reports.read
GET    /api/v1/reports/no-shows              ?from=&to=&professionalId=&unitId=   reports.financial
GET    /api/v1/reports/revenue               ?from=&to=&groupBy=day|month|professional&unitId=   reports.financial
GET    /api/v1/reports/procedures            ?from=&to=&professionalId=&unitId=   reports.read
GET    /api/v1/reports/overdue               (billing)
GET    /api/v1/reports/production            (billing)  reports.read (escopo por papel)
GET    /api/v1/reports/cash-flow             (billing)  reports.financial
POST   /api/v1/reports/:report/export        { format: CSV, from?, to?, … } → 202 { exportId, status }
GET    /api/v1/exports/:id                   status + downloadUrl assinada 15 min (quando READY)
```

**GET `/reports/dashboard`:** `date` civil opcional (default = hoje no fuso do tenant). Shape: `date`, `timezone`, `agendaByStatus` (mapa status→count do dia), `receivableTodayCents` + `receivableTodayCount` (parcelas com `due_date` = date, restante > 0; **omitido/zerado para DENTIST** sem `reports.financial`), `noShowsMonthCount`, `productionMonthCents` (mês civil do `date`), `drillDown` (paths FE). Money em **cents** inteiros. Cache Redis ≤60s (se Redis down, calcula sem cache — não 503). DENTIST: agenda/faltas/produção do próprio profissional.

**GET `/reports/no-shows`:** período `from`/`to` (teto **366** dias → `422`). Contagens `noShowCount` / `cancelledCount`, `estimatedLossCents` (preço do procedimento nas faltas), `items[]`. Exige `reports.financial`.

**GET `/reports/revenue`:** pagamentos não estornados no período (TZ tenant); `groupBy=day|month|professional`; `totalCents` + `buckets[{ key, label, amountCents, count }]`. Exige `reports.financial`.

**GET `/reports/procedures`:** agrega `production_entry` por procedimento; `items[{ procedureId, procedureCode, procedureName, count, totalCents }]`. `reports.read`; DENTIST só o próprio escopo (`403` se `professionalId` de outro).

**POST `/reports/:report/export`:** `:report` ∈ `dashboard` | `no-shows` | `revenue` | `procedures`. Body: `format` (**CSV** Must; XLSX não nesta sprint), `from`/`to` (obrigatórios exceto dashboard), filtros opcionais (`unitId`, `professionalId`, `groupBy`, `date`). Resposta `202 { data: { exportId, status: "PENDING" } }`. Job gera CSV (`;`, UTF-8 BOM; money em **cents** inteiros) no ObjectStorage. Audit `REPORT_EXPORTED` com filtros. Mesmas permissões do GET correspondente (`reports.financial` para no-shows/revenue). DENTIST: filtros já resolvidos ao próprio profissional. Cross-tenant no GET export → `404`.

**GET `/exports/:id`:** `{ id, report, format, status, error, createdAt, completedAt, downloadUrl, downloadExpiresInSeconds }`. `downloadUrl` só quando `READY` (presign **15 min**). Exige `reports.read`.

### 2.10 Assinatura, auditoria e LGPD

```
GET    /api/v1/subscription
GET    /api/v1/subscription/plans
POST   /api/v1/subscription/checkout      → Pix/boleto (QR/linha digitável na resposta) ou cartão (redirectUrl do Asaas Checkout); Idempotency-Key obrigatória (ADR-0017)
POST   /api/v1/subscription/cancel
GET    /api/v1/subscription/payments       ?cursor=&limit=
GET    /api/v1/subscription/payments/:id/pay
POST   /api/v1/webhooks/asaas              → sem usuário/tenant; header asaas-access-token
GET    /api/v1/subscription/usage
POST   /api/v1/subscription/ops/status    → ops auditado (ACTIVE|SUSPENDED|…); sem gateway

GET    /api/v1/audit-logs                   ?patientId=&actorId=&action=&from=&to=&cursor=&limit=
POST   /api/v1/privacy/data-subject-requests
GET    /api/v1/privacy/data-subject-requests          ?status=&type=&cursor=&limit=
GET    /api/v1/privacy/data-subject-requests/:id
PATCH  /api/v1/privacy/data-subject-requests/:id
POST   /api/v1/privacy/exports              exportação completa do tenant
GET    /api/v1/privacy/exports/:id          status + URL assinada (7 dias)
POST   /api/v1/internal/support-access
POST   /api/v1/internal/support-access/:id/approve
GET    /api/v1/internal/support-access/:id
GET    /api/v1/health                        liveness
GET    /health                               espelho na raiz (processo no ar)
GET    /api/v1/ready                         readiness (db, redis, storage)
GET    /ready                                espelho na raiz (mesmo contrato)
```

**GET `/subscription`** (OWNER, `subscription.manage`; DENTIST/ASB → `403`):

```json
{
  "id": "…",
  "status": "TRIAL",
  "writable": true,
  "plan": {
    "id": "…",
    "code": "ESSENCIAL",
    "name": "Essencial",
    "priceCents": 9900,
    "interval": "MONTHLY",
    "limits": { "professionals": 1, "users": 2, "units": 1, "storageGb": 5, "monthlyMessages": null },
    "active": true
  },
  "trialEndsAt": "2026-08-31T12:00:00.000Z",
  "currentPeriodEnd": "2026-08-31T12:00:00.000Z",
  "daysRemaining": 14,
  "contactMessage": "Fale conosco para ativar ou reativar o plano."
}
```

Status: `TRIAL` | `ACTIVE` | `PAST_DUE` | `SUSPENDED` | `EXPIRED` | `CANCELLED`. `SUSPENDED`/`EXPIRED`/`CANCELLED` (e trial com `currentPeriodEnd` no passado): escritas HTTP → `402 SUBSCRIPTION_REQUIRED`; GET e `POST /reports/:report/export` permanecem. Automações WhatsApp não disparam.

**GET `/subscription/plans`:** catálogo ativo (Essencial / Clínica / Rede). **GET `/subscription/usage`:** `professionals` / `users` / `units` / `storageBytes` / `messagesMonth` com `{ metric, current, limit }` (`limit` nulo = ilimitado).

**POST `/subscription/checkout`** ([ADR-0017](./adr/0017-billing-saas-asaas.md), `subscription.manage`; **não** passa pelo `subscriptionGuard`, para que EXPIRED/SUSPENDED consigam pagar): corpo `{ planCode: ESSENCIAL|CLINICA|REDE, billingMethod: PIX|BOLETO|CREDIT_CARD, cpfCnpj? }` (`cpfCnpj` só em Pix/boleto, quando o cliente ainda não existe no gateway e o tenant não tem `tax_id`; **no cartão não se envia**: a página do Asaas coleta os dados do titular). Header `Idempotency-Key` obrigatório. `201`:
- Pix/boleto → `{ checkoutId, billingMethod, status, payment?: { id, dueDate, valueCents, status, invoiceUrl, pix?: { qrCodeBase64, payload, expiresAt }, boleto?: { digitableLine, url } } }`
- cartão → `{ checkoutId, billingMethod, status, redirectUrl }` (página hospedada do Asaas; nenhum dado de cartão passa pelo app; o retorno do navegador **não** confirma pagamento).
Erros: `400` (corpo/chave), `409 SUBSCRIPTION_ALREADY_ACTIVE` (ACTIVE/PAST_DUE), `409 IDEMPOTENCY_KEY_REUSED`, `422 PLAN_NOT_FOUND` / `CPF_CNPJ_REQUIRED` / `PLAN_LIMIT_EXCEEDED` (uso atual não cabe no plano), `502 BILLING_GATEWAY_ERROR` (`details.inconclusive` = pode ter sido processado; repetir com a mesma chave), `503 BILLING_UNAVAILABLE` (`BILLING_PROVIDER=manual`), `503 BILLING_MISCONFIGURED` (cartão com `APP_PUBLIC_URL` em localhost: o Asaas exige URL pública). A assinatura só vira `ACTIVE` quando o webhook confirma o pagamento.

**GET `/subscription`** também devolve `billingMethod`, `billingProvider` (`ASAAS`|`MANUAL`), `hasRecurringBilling` (há recorrência no gateway: habilita cancelar) e `checkoutAvailable` (pagamento online ligado no servidor). A tela usa esses campos para decidir CTA, cancelamento e o aviso de "pagamento online indisponível".

**GET `/subscription/payments`:** cobranças espelhadas (`{ id, externalPaymentId, status, valueCents, dueDate, paidAt, billingType, invoiceUrl, bankSlipUrl }`), cursor por id. **GET `/subscription/payments/:id/pay`:** QR Pix atualizado ou boleto da cobrança em aberto. **POST `/subscription/cancel`:** `{ reason? }` — remove a recorrência no Asaas (apaga cobranças pendentes/vencidas) e leva a `CANCELLED`; **durante o teste (`TRIAL`)** só desfaz a cobrança agendada e a clínica continua em `TRIAL` (`200 { status: "TRIAL" }`); `409 NO_BILLING_SUBSCRIPTION` se não houver recorrência.

**POST `/webhooks/asaas`:** valida `asaas-access-token` (tempo constante; `401 INVALID_WEBHOOK_TOKEN`), persiste o evento em `platform.asaas_event` (UNIQUE no `id` do evento) e responde **exatamente** `200` (o Asaas trata qualquer outro código como falha e pausa a fila após 15). Processamento assíncrono no worker; evento duplicado/desconhecido/de tenant inexistente também responde `200`. Mapeamento de eventos e derivação de status: [DDT §7](./desenvolvimento/DDT-integracao-asaas.md).

Ativação/suspensão manual (contingência, `BILLING_PROVIDER=manual`): script `backend/scripts/ops-subscription-status.ts` ou `POST /subscription/ops/status`. Reconciliação sob demanda: `backend/scripts/ops-asaas-reconcile.ts`.

Estouro de limite (profissionais, usuários administrativos, unidades, storage no upload): `402 PLAN_LIMIT_EXCEEDED` com mensagem acionável (`details.href` = `/app/assinatura`). `messages_month` é observado, não bloqueia envio da inbox.

**GET `/audit-logs`** (OWNER, `audit.read`; demais papéis → `403 FORBIDDEN`). Módulo HTTP `platform`. Paginação cursor (`nextCursor`); `limit` default 50, teto 100. `from`/`to` ISO-8601; omissão = últimos 366 dias. Período > 366 dias → `422 PERIOD_TOO_LONG`. `from` > `to` → `422 PERIOD_INVALID`. Relatório “quem acessou o paciente X” = o mesmo endpoint com `patientId`. Cross-tenant: RLS (lista do outro tenant não aparece; `X-Tenant-Id` sem membership → `403 TENANT_NOT_ALLOWED`).

Leitura clínica passa a gravar `action=CLINICAL_READ`. Histórico `READ` permanece. Filtro `action=CLINICAL_READ` ou `action=READ` devolve os dois. Sem backfill.

Payload **sem** corpo clínico, senha, token, DEK ou CPF completo (docs/17 §5.3). `audit_log` é append-only (trigger + `GRANT` SELECT/INSERT).

```json
{
  "items": [
    {
      "id": "…",
      "actorId": "…",
      "actorType": "USER",
      "action": "CLINICAL_READ",
      "resourceType": "medical_record",
      "resourceId": "…",
      "patientId": "…",
      "ipAddress": "127.0.0.1",
      "metadata": { "path": "/api/v1/patients/…/record", "method": "GET" },
      "createdAt": "2026-08-17T12:00:00.000Z"
    }
  ],
  "nextCursor": null
}
```

Ações Must nesta superfície (gravação via `writeAuditLog` em `shared/`): `CLINICAL_READ` (alias `READ`), `NOTE_CREATED`, `NOTE_AMENDED`, `MESSAGE_SENT` (template + destinatário mascarado, sem corpo), `EXPORT_REQUESTED` / `EXPORT_COMPLETED`, `DSR_CREATED` / `DSR_COMPLETED` / `DSR_REJECTED`, `SUPPORT_ACCESS_GRANTED` / `SUPPORT_ACCESS_USED`.

**POST `/privacy/exports`** (OWNER, `data.export` → `202`): dispara job assíncrono de ZIP do **próprio** tenant (JSON + CSV + anexos originais). Não reusa `POST /reports/:report/export`. `Idempotency-Key` opcional; reuso no mesmo tenant → `409 IDEMPOTENCY_KEY_REUSED`. `SUSPENDED`/`EXPIRED` **permanecem** liberados. Outro papel → `403`.

```json
{ "exportId": "…", "status": "PENDING" }
```

**GET `/privacy/exports/:id`** (`data.export`): outro tenant → `404`. `PENDING`/`RUNNING`: `url` nulo. `READY`: URL assinada **7 dias** (`expiresIn`: 604800). `FAILED`: `error` preenchido. Decrypt clínico ocorre **só** no job; DEK/KEK nunca no ZIP.

```json
{
  "exportId": "…",
  "status": "READY",
  "url": "https://…",
  "expiresIn": 604800,
  "error": null,
  "createdAt": "2026-08-17T12:00:00.000Z"
}
```

**POST `/privacy/data-subject-requests`** (OWNER, `data.export` → `201`): registra solicitação do titular. Tipos `ACCESS` | `CORRECTION` | `DELETION` | `PORTABILITY` | `REVOKE_CONSENT`. `dueAt` = agora + `DSR_DUE_DAYS` (default 15). `ACCESS`/`PORTABILITY` disparam job de pacote PDF+JSON (um paciente). `REVOKE_CONSENT` revoga marketing imediatamente e conclui (`COMPLETED`); transacional segue. `CORRECTION` só registra — correção cadastral na ficha; clínico via amend. `DELETION` inicia `IN_PROGRESS` e dispara job de anonimização de identificadores (prontuário permanece; `resolution` cita obrigação legal de guarda). Se o job falhar, o DSR fica `IN_PROGRESS` até o Owner concluir via PATCH. `SUSPENDED`/`EXPIRED` permanecem liberados. Paciente de outro tenant → `404`. Outro papel → `403`.

```json
{
  "id": "…",
  "patientId": "…",
  "type": "ACCESS",
  "status": "RECEIVED",
  "requestedAt": "2026-08-17T12:00:00.000Z",
  "dueAt": "2026-09-01T12:00:00.000Z",
  "completedAt": null,
  "handledBy": null,
  "resolution": null,
  "exportUrl": null,
  "expiresIn": null
}
```

**GET `/privacy/data-subject-requests`** (`?status=&type=&patientId=&cursor=&limit=`): lista do tenant; cursor; `limit` default 50, teto 100.

**GET `/privacy/data-subject-requests/:id`**: outro tenant → `404`. Pacote pronto: `exportUrl` assinada **7 dias** (`expiresIn`: 604800). Decrypt clínico só no job; DEK/KEK nunca no ZIP. Nomes de arquivo no ZIP: `paciente.pdf` / `paciente.json` (sem diagnóstico).

**PATCH `/privacy/data-subject-requests/:id`** `{ status?, resolution? }`: `IN_PROGRESS` | `COMPLETED` | `REJECTED`. `COMPLETED`/`REJECTED` exigem `resolution`. Terminal não transita → `422 DSR_STATUS_INVALID`. Audit `DSR_COMPLETED` / `DSR_REJECTED`.

**POST `/internal/support-access`** (operador de plataforma: `user.platformRole = OPERATOR` ou e-mail em `PLATFORM_OPERATOR_EMAILS` → `201`): pede break-glass. Body `{ tenantId, reason, hours? }`. `reason` < 20 caracteres → `422 REASON_TOO_SHORT`. `hours` ≤ 0 ou > 4 → `422 GRANT_WINDOW_INVALID` (omissão = 4). Sem membership no tenant alvo. Status inicial `PENDING`. Exceção de contrato: `tenantId` no body identifica a clínica-alvo (o JWT do operador é de um tenant dummy).

**POST `/internal/support-access/:id/approve`**: segundo operador. Solicitante não pode aprovar a si → `409 SELF_APPROVAL_FORBIDDEN`. `expiresAt` = agora + `hours` (teto 4 h). Audit `SUPPORT_ACCESS_GRANTED` no `audit_log` da clínica (`actorType: SUPPORT`). E-mail ao Owner. Sem 2º ator o grant permanece inutilizável.

**GET `/internal/support-access/:id`**: detalhe da concessão. Inexistente → `404`.

Com grant `APPROVED` vigente, o operador envia `X-Support-Grant-Id` + `X-Tenant-Id` e assume contexto somente leitura (`patients.read`, `clinical_records.read`, `agenda.read`). Cada request grava `SUPPORT_ACCESS_USED`. Grant de outro operador, pendente ou expirado → `404` (não revela existência). Operador que troca `X-Tenant-Id` sem grant → `404`. Usuário comum sem membership → `403 TENANT_NOT_ALLOWED`.

Script ops: `backend/scripts/ops-support-access.ts` (`request` / `approve` / `get`). Sem UI de suporte nesta sprint.

Script ops: `backend/scripts/ops-support-access.ts` (`request` / `approve` / `get`). Sem UI de suporte nesta sprint.

**GET `/health`** (sem auth): liveness. `{ "data": { "status": "ok", "service": "api" } }`. Não sonda dependências. Espelho na raiz `GET /health`.

**GET `/ready`** (sem auth): Postgres `SELECT 1`, Redis `PING`, storage `headObject` barato (`__ready__/probe`; objeto ausente conta como alcançável). `200` só se `db`, `redis` e `storage` são `true`. Qualquer falha → `503` com os booleanos. Corpo **nunca** inclui URL de conexão, chave ou nome de bucket. Worker permanece só com `/health`. Job `anomaly-clinical-read` (Should) conta `CLINICAL_READ`/`READ` por ator em 5 min; acima de `CLINICAL_READ_ANOMALY_N` (default 40) grava `ANOMALY_TRIGGERED` e loga — **não** bloqueia o usuário.

```json
{ "data": { "db": true, "redis": true, "storage": true } }
```

**Assinatura (E10 — S7 base; S9 cobrança automática):** `subscription.manage` (OWNER) para GET subscription/plans/usage e ops. Envelope `{ data }`.

- `GET /subscription` — assinatura atual + plano (`status`: TRIAL|ACTIVE|PAST_DUE|SUSPENDED|EXPIRED|CANCELLED; `trialEndsAt`; `plan.limits`).
- `GET /subscription/plans` — catálogo ativo (Essencial / Clínica / Rede).
- `GET /subscription/usage` — métricas ao vivo vs limites (`professionals`, `admin_users`, `units`, `storage_bytes`, `messages_month`, `patients`).
- `POST /subscription/checkout`, `POST /subscription/cancel`, `GET /subscription/payments[/:id/pay]`, `POST /webhooks/asaas` — cobrança automática via Asaas ([ADR-0017](./adr/0017-billing-saas-asaas.md)); detalhes acima.
- `POST /subscription/ops/status` — `{ "status", "reason"? }` no tenant autenticado; audita `SUBSCRIPTION_STATUS_CHANGED`; em SUSPENDED/EXPIRED/CANCELLED desliga automações de messaging. Alternativa CLI: `backend/scripts/ops-subscription-status.ts`.

**Guards:** `subscriptionGuard` bloqueia escrita HTTP (`402 SUBSCRIPTION_REQUIRED`) quando SUSPENDED/EXPIRED/CANCELLED; GET, `POST /reports/:report/export`, `POST /subscription/checkout|cancel|ops/*` e `/webhooks/*` liberados. `PlanLimitGuard` → `402 PLAN_LIMIT_EXCEEDED` em novo profissional, convite de usuário admin, unidade e upload de storage.
## 3. Contratos detalhados dos fluxos críticos

### 3.1 Criar agendamento

```http
POST /api/v1/appointments
Authorization: Bearer <token>
Idempotency-Key: 018f5d4a-...
Content-Type: application/json

{
  "patientId": "018f5c2b-...",
  "professionalId": "018f5c31-...",
  "chairId": "018f5c40-...",
  "procedureId": "018f5c55-...",
  "startsAt": "2026-08-20T14:00:00-03:00",
  "endsAt": "2026-08-20T14:40:00-03:00",
  "notes": "Paciente com sensibilidade no 26",
  "notifyPatient": true
}
```

```http
201 Created
{
  "data": {
    "id": "018f5d61-...",
    "status": "SCHEDULED",
    "startsAt": "2026-08-20T17:00:00Z",
    "endsAt": "2026-08-20T17:40:00Z",
    "patient": { "id": "018f5c2b-...", "name": "Ana Souza", "phonePrimary": "+5562999990000" },
    "professional": { "id": "018f5c31-...", "name": "Dra. Letícia" },
    "procedure": { "id": "018f5c55-...", "name": "Restauração em resina", "defaultMinutes": 40 },
    "scheduledNotifications": [
      { "key": "CONFIRMATION_D1", "sendAt": "2026-08-19T12:00:00Z" },
      { "key": "REMINDER_H3", "sendAt": "2026-08-20T14:00:00Z" }
    ]
  }
}
```

Conflito:

```http
409 Conflict
{ "error": { "code": "SLOT_UNAVAILABLE", "message": "Este horário já está ocupado.",
  "details": [{ "conflictingAppointmentId": "018f5d20-...", "suggestedSlots": ["2026-08-20T14:45:00-03:00"] }] } }
```

### 3.2 Consultar disponibilidade

```http
GET /api/v1/availability?professionalId=018f5c31-...&date=2026-08-20&procedureId=018f5c55-...
```

```json
{
  "data": {
    "date": "2026-08-20",
    "timezone": "America/Sao_Paulo",
    "slotMinutes": 40,
    "slots": [
      { "startsAt": "2026-08-20T08:00:00-03:00", "endsAt": "2026-08-20T08:40:00-03:00", "available": true },
      { "startsAt": "2026-08-20T08:40:00-03:00", "endsAt": "2026-08-20T09:20:00-03:00", "available": false, "reason": "BOOKED" },
      { "startsAt": "2026-08-20T12:00:00-03:00", "endsAt": "2026-08-20T12:40:00-03:00", "available": false, "reason": "OUT_OF_HOURS" }
    ]
  }
}
```

### 3.3 Registrar evolução clínica

```http
POST /api/v1/patients/018f5c2b-.../record/notes
{
  "appointmentId": "018f5d61-...",
  "content": "Realizada restauração classe II em 26 com resina composta. Anestesia local com lidocaína 2%. Paciente tolerou bem.",
  "procedures": [{ "procedureId": "018f5c55-...", "toothCode": "26", "face": "O" }]
}
```

```http
201 Created
{
  "data": {
    "id": "018f5e10-...",
    "appointmentId": "018f5d61-...",
    "professionalId": "018f5c40-...",
    "content": "Realizada restauração classe II em 26 com resina composta. Anestesia local com lidocaína 2%. Paciente tolerou bem.",
    "procedures": [{ "procedureId": "018f5c55-...", "toothCode": "26", "face": "O" }],
    "version": 1,
    "supersedesId": null,
    "amendReason": null,
    "signedAt": "2026-08-20T17:35:12Z",
    "createdAt": "2026-08-20T17:35:12Z",
    "signature": { "type": "SIMPLE", "userId": "018f5c31-...", "croNumber": "12345", "croState": "GO" },
    "contentHash": "sha256:9f2b..."
  }
}
```

`PATCH`/`DELETE` nessa evolução → `423 RECORD_IMMUTABLE` (usar `POST .../notes/:id/amend` com `{ "content", "reason" }`). Sem CRO → `422 BUSINESS_RULE_VIOLATION`. `treatmentItemIds` no POST notes → `422` com hint de execute (S5). Odontograma/produção na execução do plano: `POST /treatment-items/:id/execute`.

### 3.4 Aprovar orçamento (gera plano + parcelas)

```http
POST /api/v1/quotes/018f5f00-.../decision
Idempotency-Key: 018f5f01-...
{
  "decision": "APPROVED",
  "approvedItemIds": ["018f5f10-...", "018f5f11-..."],
  "payment": {
    "installments": 6,
    "firstDueDate": "2026-09-05",
    "method": "PIX",
    "downPaymentCents": 20000
  }
}
```

```json
{
  "data": {
    "quoteId": "018f5f00-...",
    "status": "PARTIALLY_APPROVED",
    "treatmentPlanId": "018f5f30-...",
    "treatmentItems": 2,
    "receivable": {
      "id": "018f5f40-...",
      "totalCents": 180000,
      "installments": [
        { "number": 1, "dueDate": "2026-09-05", "amountCents": 30000 },
        { "number": 2, "dueDate": "2026-10-05", "amountCents": 30000 }
      ]
    }
  }
}
```

Invariante testada: `sum(installments.amountCents) + downPaymentCents == quote.approvedTotalCents`.

### 3.5 Webhook do WhatsApp (WAHA)

```http
POST /api/v1/webhooks/whatsapp
X-Webhook-Hmac: <hmac-waha>
{
  "event": "message",
  "session": "tenant_<uuid>",
  "payload": {
    "id": "true_<id>",
    "from": "5562999990000",
    "type": "button",
    "button": { "payload": "CONFIRM_018f5d61", "text": "Confirmar" }
  }
}
```

Formato ilustrativo — o payload real do WAHA/GOWS deve ser mapeado no adapter. Processamento: HMAC do WAHA sobre o **raw body** → `401` se inválida → enfileirar `process-whatsapp-webhook` com `jobId=provider_message_id` → `200`. Redis down → `503` (WAHA retenta se configurado). Idempotência: unique parcial em `message.provider_message_id`. Tenant via `session` → `whatsapp_account.session_name`. Sem handshake `hub.challenge`.

| payload / texto | Efeito |
| --- | --- |
| `CONFIRM_<appointmentId>` | `CONFIRMED` (somente a partir de `SCHEDULED`) + outbox `messaging.confirmation_received` |
| `CANCEL_<appointmentId>` | cancel + motivo "paciente via WhatsApp" + waitlist via outbox |
| `WAITLIST_<offerId>` | first-accept-wins (`applyWaitlistAcceptByOfferId`) |
| `REBOOK_<id>` ou texto “Remarcar” | `conversation.status=PENDING` (sem inbox UI na S3) |
| outro | persiste inbound; sem efeito de domínio |

Status de entrega **não** debita crédito Meta.

### 3.6 Upload de anexo (URL pré-assinada)

```http
POST /api/v1/patients/018f5c2b-.../attachments/presign
{ "fileName": "rx-panoramica.jpg", "mimeType": "image/jpeg", "sizeBytes": 2411233, "category": "XRAY" }
```

```json
{
  "data": {
    "uploadUrl": "https://storage.../tenant/018f.../abc?X-Amz-Signature=...",
    "method": "PUT",
    "headers": { "Content-Type": "image/jpeg" },
    "storageKey": "tenant/018f.../patients/018f5c2b/abc.jpg",
    "expiresIn": 900
  }
}
```

O cliente faz `PUT` direto no storage e depois confirma via `POST /attachments` com `storageKey` + `checksumSha256`. A API valida tamanho, tipo e cota do plano **antes** de emitir a URL.

```http
POST /api/v1/patients/018f5c2b-.../attachments
{
  "storageKey": "tenants/018f.../patients/018f5c2b/.../rx-panoramica.jpg",
  "checksumSha256": "9f2b...",
  "fileName": "rx-panoramica.jpg",
  "mimeType": "image/jpeg",
  "sizeBytes": 2411233,
  "category": "XRAY",
  "clinicalNoteId": null
}
```

```http
GET /api/v1/attachments/018f5e20-.../download
→ { "data": { "downloadUrl": "https://storage...?", "expiresIn": 900 } }

DELETE /api/v1/attachments/018f5e20-...
{ "reason": "arquivo enviado por engano" }
```

### 3.7 Financeiro — baixa, caixa e relatórios E7 (esqueleto S6)

Envelope `{ data }` / `{ error }`; dinheiro `*Cents` inteiro; datas ISO com offset.

**POST `/installments/:id/payments`** (`Idempotency-Key`):

```json
{
  "amountCents": 30000,
  "receivedAt": null,
  "notes": null,
  "splits": [
    { "method": "PIX", "amountCents": 20000 },
    { "method": "CASH", "amountCents": 10000 }
  ]
}
```

`amountCents` = Σ splits. Pode ser menor que o saldo (parcial) ou maior (excedente → crédito). Resposta: `{ paymentId, receiptNumber, installmentStatus, creditCentsGranted, cashSessionId }`.

**POST `/payments/:id/reverse`:** `{ "reason": "lançado na parcela errada" }` (≥10).

**POST `/cash-sessions`:** `{ "unitId", "openingCents", "openingByMethod"? }`. Sem `openingByMethod`, o fundo inicial conta como `CASH`. `Idempotency-Key` obrigatório. Uma sessão `OPEN` por operador/unidade.

**GET `/cash-sessions/current?unitId=`:** sessão `OPEN` do ator na unidade, ou `null`. Inclui `expectedByMethod` ao vivo, `openForHours` e `openTooLong` (`true` se aberta há mais de 24h; não auto-fecha).

**POST `/cash-sessions/:id/movements`:** `{ "kind": "SUPPLY"|"WITHDRAWAL", "amountCents", "method", "reason" }` (`reason` ≥10). Sessão `CLOSED` → `423 RECORD_IMMUTABLE`.

**POST `/cash-sessions/:id/close`:**

```json
{
  "countedByMethod": [
    { "method": "CASH", "countedCents": 150000 },
    { "method": "PIX", "countedCents": 80000 }
  ],
  "differenceReason": null
}
```

**GET|POST `/financial-categories`:** query `?kind=REVENUE|EXPENSE`. POST `{ "name", "kind", "parentId"? }`.

**POST `/payables`:** `{ "unitId", "categoryId", "description", "amountCents", "dueDate", "supplier?", "recurrence?" }` com `recurrence: { "frequency": "MONTHLY", "until"? }`. `POST /payables/:id/pay` exige `Idempotency-Key` e `{ "method" }`. CASH sem caixa → `422 CASH_SESSION_REQUIRED`. Pagar recorrente vigente cria o próximo `OPEN` (+1 mês civil) se `until` ainda não passou.

**GET `/installments?status=OVERDUE`:** inclui parcelas `OPEN`/`PARTIALLY_PAID` com `due_date` anterior a hoje (TZ da clínica), mesmo se o job ainda não rodou.

**GET `/reports/cash-flow`:** `basis` obrigatória (`CASH`|`ACCRUAL`). Shape: `openingBalanceCents`, `inflowsCents`, `outflowsCents`, `closingBalanceCents`, `byDay`, `byCategory`, `byPaymentMethod`. `openingBalanceCents` é o saldo **caixa** acumulado antes de `from` (pagamentos não estornados − contas pagas), inclusive quando `basis=ACCRUAL`.

**GET `/reports/overdue`:** `{ buckets: [{ band: "1_15"|"16_30"|"31_60"|"60_plus", count, totalCents, items: [...] }] }`. Inclui `OPEN`/`PARTIALLY_PAID` já vencidas (TZ da clínica).

**GET `/reports/production`:** `{ items: [{ professionalId, professionalName, executedCents, receivedCents, proceduresCount }], rows: [...] }`. DENTIST: somente o próprio profissional (`403` se `professionalId` de outro).

**GET `/payments/:id/receipt`:** URL assinada 15 min (`finance.read`). `409 PDF_PENDING` até o job gravar o PDF. O PDF traz faixa “Este documento não é nota fiscal”.

**POST `/payments/:id/send-receipt`:** `{ channel: WHATSAPP|EMAIL|COPY }`. Sem WA CONNECTED cai para e-mail ou COPY (texto para colar). Template `payment_receipt`.

**POST `/installments/:id/charge`:** cobrança **manual** (`finance.write`) com template `payment_overdue`. Só parcela vencida em aberto.

Payloads HTTP vivos (Bloco 5): recibo PDF/send, `POST /installments/:id/charge`, `GET /reports/cash-flow|overdue|production`.

## 4. Segurança dos endpoints

| Middleware (ordem) | Função |
| --- | --- |
| `helmet` | Cabeçalhos de segurança |
| `cors` | Origens permitidas por ambiente |
| `requestId` | Correlação |
| `bodyLimit` | 1 MB padrão (webhook 2 MB; upload não passa pela API) |
| `rateLimit` | Global por IP, por tenant e específico para rotas públicas/auth |
| `authenticate` | Valida JWT, popula `req.auth` |
| `tenantContext` | Resolve e valida tenant, popula `req.ctx` |
| `authorize(permission)` | Checagem por papel/permissão no recurso |
| `subscriptionGuard` | Bloqueia escrita em tenant suspenso (leitura e exportação liberadas) |
| `validate(schema)` | Zod em body/query/params |
| `auditRead` | Registra leitura de dado clínico sensível |
| `errorHandler` | `DomainError → HTTP`, log estruturado, resposta sem stack |

### Matriz permissão × endpoint (extrato)

| Endpoint | OWNER | DENTIST | RECEPTION | ASSISTANT | FINANCE |
| --- | :-: | :-: | :-: | :-: | :-: |
| `POST /appointments` | ✔ | ✔ | ✔ | ✔ | ✖ |
| `GET /patients/:id/record/*` | ✔ | ✔ | ✖ | ✔ (leitura) | ✖ |
| `POST /patients/:id/record/notes` | ✔ | ✔ | ✖ | ✖ | ✖ |
| `POST /quotes/:id/decision` | ✔ | ✔ | ✔ | ✖ | ✖ |
| `GET /reports/cash-flow` | ✔ | ✖ | ✖ | ✖ | ✔ |
| `GET /reports/dashboard` | ✔ | ✔ (sem financeiro consolidado) | ✔ (sem financeiro) | ✖ | ✔ |
| `GET /reports/revenue` | ✔ | ✖ | ✖ | ✖ | ✔ |
| `POST /installments/:id/payments` | ✔ | ✖ | ✔ | ✖ | ✔ |
| `GET /clinic/professionals` | ✔ | ✔ | ✔ | ✔ | ✖ |
| `PATCH /clinic` | ✔ | ✖ | ✖ | ✖ | ✖ |
| `POST /privacy/exports` | ✔ | ✖ | ✖ | ✖ | ✖ |
| `GET /privacy/exports/:id` | ✔ | ✖ | ✖ | ✖ | ✖ |
| `GET|POST|PATCH /privacy/data-subject-requests` | ✔ | ✖ | ✖ | ✖ | ✖ |

`POST|GET /internal/support-access` e `POST …/:id/approve` são de **operador de plataforma** (`user.platformRole = OPERATOR` ou `PLATFORM_OPERATOR_EMAILS`), não de papéis da clínica. Sem grant, operador não lê tenant (`404`).

## 5. Política de versionamento

- `v1` é estável: mudanças **aditivas** (novo campo opcional, novo endpoint) não geram nova versão.
- Quebra de contrato (remover/renomear campo, mudar tipo ou semântica) exige `v2`, com `v1` mantida por no mínimo 6 meses e cabeçalhos `Deprecation`/`Sunset`.
- Cada módulo registra suas rotas sob o router da versão; a implementação pode ser compartilhada entre versões desde que a **camada de interface** traduza (controllers/DTOs separados por versão, use cases reaproveitados).
- Endpoints internos/experimentais ficam sob `/api/v1/internal/*` e não têm garantia de estabilidade.
- Contrato verificado no CI por diff do OpenAPI: mudança incompatível sem bump de versão falha o build.

## 6. Padrões operacionais

**Idempotência:** `Idempotency-Key` armazenado por 24h com hash do corpo; repetição com mesmo corpo devolve a resposta original; corpo diferente com a mesma chave → `409 IDEMPOTENCY_KEY_REUSED`.

**Concorrência otimista:** recursos editáveis expõem `version`; `PATCH` aceita `If-Match: "<version>"` e devolve `412` em conflito (usado na agenda, onde duas recepcionistas podem editar ao mesmo tempo).

**Long-running:** exportações de relatório retornam `202` com `{ exportId }`; cliente consulta `GET /exports/:id` (URL assinada 15 min quando READY).

**Webhooks de saída (fase 2):** entrega assinada com HMAC, retry exponencial em 5 tentativas, log consultável pelo tenant.
