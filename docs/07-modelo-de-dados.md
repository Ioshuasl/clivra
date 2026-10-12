# 07 — Modelo de Dados

Convenções: PostgreSQL, `snake_case` nas tabelas/colunas, PK `uuid` (v7), `tenant_id uuid NOT NULL` em toda tabela operacional, `created_at`/`updated_at timestamptz`, dinheiro em **centavos** (`bigint`), timestamps em **UTC**, soft delete apenas onde indicado (`deleted_at`).

## 1. Diagrama de contexto (agregados por módulo)

```
┌ clinic ──────────────────┐  ┌ identity ────────────────┐
│ tenant                   │  │ user                     │
│ unit                     │  │ membership ──► tenant     │
│ chair                    │  │ invitation               │
│ business_hours           │  │ refresh_token            │
│ business_hours_exception │  └──────────────────────────┘
│ procedure                │
│ professional ──► user    │  ┌ subscription ────────────┐
└──────────────────────────┘  │ plan / subscription      │
                              │ usage_counter            │
┌ patients ────────────────┐  └──────────────────────────┘
│ patient                  │
│ patient_contact          │  ┌ messaging ───────────────┐
│ legal_guardian           │  │ whatsapp_account         │
│ consent                  │  │ message_template         │
└─────────┬────────────────┘  │ conversation             │
          │                   │ message                  │
┌ scheduling ──────────────┐  │ automation               │
│ appointment              │  │ automation_run           │
│ appointment_history      │  │ message_credit_ledger    │
│ schedule_block           │  └──────────────────────────┘
│ waitlist_entry           │
│ public_booking_token     │  ┌ platform ────────────────┐
└─────────┬────────────────┘  │ outbox_event             │
          │                   │ audit_log                │
┌ clinical-records ────────┐  │ platform_audit_log       │
│ medical_record           │  │ data_subject_request     │
│ anamnesis_form/response  │  │ tenant_crypto_key        │
│ clinical_alert           │  └──────────────────────────┘
│ tooth_state (odontograma)│  ┌ billing ─────────────────┐
│ clinical_note (+version) │  │ receivable / installment  │
│ attachment               │  │ payment / payment_split   │
└─────────┬────────────────┘  │ payable                   │
          │                   │ cash_session / movement   │
┌ treatments ──────────────┐  │ patient_credit_ledger     │
│ quote / quote_item       │  │ financial_category        │
│ treatment_plan / item    │  │ production_entry          │
│ executed_procedure       │  │ receipt_number_counter    │
└──────────────────────────┘  └──────────────────────────┘
```

## 2. Tabelas — clinic e identity

```sql
CREATE TABLE tenant (
  id                uuid PRIMARY KEY,
  name              text NOT NULL,
  slug              citext NOT NULL UNIQUE,          -- usado no link público /agendar/{slug}
  legal_name        text,
  tax_id            text,                            -- CNPJ/CPF
  responsible_cro   text,                            -- CRO do responsável técnico
  timezone          text NOT NULL DEFAULT 'America/Sao_Paulo',
  booking_settings  jsonb NOT NULL DEFAULT '{"minLeadMinutes":120,"maxLeadDays":60,"publicStatus":"REQUESTED","courtesyTransactionalMessages":50}',
  chairs_enabled    boolean NOT NULL DEFAULT false,   -- agenda/cadastro por cadeira (tenant)
  status            text NOT NULL DEFAULT 'TRIAL',    -- TRIAL|ACTIVE|PAST_DUE|SUSPENDED|CANCELLED|DELETED
  trial_ends_at     timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE unit (
  id           uuid PRIMARY KEY,
  tenant_id    uuid NOT NULL REFERENCES tenant(id),
  name         text NOT NULL,
  is_default   boolean NOT NULL DEFAULT false,
  phone        text,
  address      jsonb,                                 -- {street, number, complement, district, city, state, zip}
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_unit_default ON unit (tenant_id) WHERE is_default;

CREATE TABLE chair (
  id         uuid PRIMARY KEY,
  tenant_id  uuid NOT NULL,
  unit_id    uuid NOT NULL REFERENCES unit(id),
  name       text NOT NULL,
  color      text,
  active     boolean NOT NULL DEFAULT true
);

CREATE TABLE "user" (
  id                 uuid PRIMARY KEY,
  email              citext NOT NULL UNIQUE,
  password_hash      text NOT NULL,                   -- Argon2id
  name               text NOT NULL,
  phone              text,
  email_verified_at  timestamptz,
  last_login_at      timestamptz,
  failed_attempts    smallint NOT NULL DEFAULT 0,
  locked_until       timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE membership (
  id                uuid PRIMARY KEY,
  tenant_id         uuid NOT NULL REFERENCES tenant(id),
  user_id           uuid NOT NULL REFERENCES "user"(id),
  role              text NOT NULL,                    -- OWNER|DENTIST|RECEPTION|ASSISTANT|FINANCE
  default_unit_id   uuid REFERENCES unit(id),
  permissions       jsonb NOT NULL DEFAULT '{}',      -- overrides pontuais sobre o papel
  active            boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id)
);

CREATE TABLE professional (               -- perfil clínico de um membership
  id             uuid PRIMARY KEY,
  tenant_id      uuid NOT NULL,
  membership_id  uuid NOT NULL REFERENCES membership(id),
  cro_number     text,
  cro_state      char(2),
  specialties    text[] NOT NULL DEFAULT '{}',
  color          text,                                -- cor na agenda
  active         boolean NOT NULL DEFAULT true,
  UNIQUE (tenant_id, membership_id)
);

CREATE TABLE business_hours (
  id               uuid PRIMARY KEY,
  tenant_id        uuid NOT NULL,
  unit_id          uuid NOT NULL REFERENCES unit(id),
  professional_id  uuid REFERENCES professional(id),  -- NULL = horário da unidade
  weekday          smallint NOT NULL CHECK (weekday BETWEEN 1 AND 7), -- ISO: 1=Mon … 7=Sun
  starts_at        time NOT NULL,
  ends_at          time NOT NULL,
  CHECK (ends_at > starts_at)
);

CREATE TABLE business_hours_exception (
  id               uuid PRIMARY KEY,
  tenant_id        uuid NOT NULL,
  unit_id          uuid NOT NULL,
  professional_id  uuid,
  date             date NOT NULL,
  closed           boolean NOT NULL DEFAULT true,
  starts_at        time,
  ends_at          time,
  reason           text
);

CREATE TABLE procedure (
  id                 uuid PRIMARY KEY,
  tenant_id          uuid NOT NULL,
  code               text NOT NULL,                   -- código interno / TUSS-odonto futuro
  name               text NOT NULL,
  specialty          text,
  default_minutes    smallint NOT NULL DEFAULT 30,
  price_cents        bigint NOT NULL DEFAULT 0,
  requires_tooth     boolean NOT NULL DEFAULT false,
  requires_face      boolean NOT NULL DEFAULT false,
  publicly_bookable  boolean NOT NULL DEFAULT false,
  active             boolean NOT NULL DEFAULT true,
  created_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);
```

## 3. Tabelas — patients

```sql
CREATE TABLE patient (
  id               uuid PRIMARY KEY,
  tenant_id        uuid NOT NULL,
  unit_id          uuid NOT NULL,                     -- unidade de origem
  code             bigint NOT NULL,                   -- nº de ficha sequencial por tenant (RF-E3-13); ver patient_code_counter
  name             text NOT NULL,
  social_name      text,
  cpf              char(11),
  birth_date       date,
  sex              text,                              -- livre; não bloqueia cadastro
  phone_primary    text NOT NULL,
  phone_secondary  text,
  email            citext,
  address          jsonb,
  how_found_us     text,                              -- origem/indicação (base do CRM futuro)
  notes            text,
  photo_key        text,                              -- chave no object storage
  origin           text NOT NULL DEFAULT 'INTERNAL',  -- INTERNAL|PUBLIC_BOOKING
  has_overdue      boolean NOT NULL DEFAULT false,    -- flag operacional (subscriber S6); sem valor na UI clínica
  active           boolean NOT NULL DEFAULT true,
  deleted_at       timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_patient_tenant_code ON patient (tenant_id, code);
CREATE UNIQUE INDEX uq_patient_cpf   ON patient (tenant_id, cpf) WHERE cpf IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_patient_name        ON patient (tenant_id, name);
CREATE INDEX idx_patient_phone       ON patient (tenant_id, phone_primary);
CREATE INDEX idx_patient_name_trgm   ON patient USING gin (name gin_trgm_ops);  -- busca por nome parcial

CREATE TABLE patient_code_counter (
  tenant_id uuid PRIMARY KEY REFERENCES tenant(id),
  last_code bigint NOT NULL DEFAULT 0
);

CREATE TABLE legal_guardian (
  id           uuid PRIMARY KEY,
  tenant_id    uuid NOT NULL,
  patient_id   uuid NOT NULL REFERENCES patient(id),
  name         text NOT NULL,
  cpf          char(11),
  relationship text,
  phone        text,
  email        citext
);

CREATE TABLE consent (
  id            uuid PRIMARY KEY,
  tenant_id     uuid NOT NULL,
  patient_id    uuid NOT NULL REFERENCES patient(id),
  type          text NOT NULL,        -- DATA_PROCESSING|WHATSAPP_MARKETING|IMAGE_USE|TERMS
  granted       boolean NOT NULL,
  document_version text NOT NULL,
  channel       text NOT NULL,        -- IN_PERSON|LINK|WHATSAPP|PUBLIC_BOOKING
  ip_address    inet,
  granted_at    timestamptz NOT NULL DEFAULT now(),
  revoked_at    timestamptz
);
CREATE INDEX idx_consent_patient ON consent (tenant_id, patient_id, type);
```

## 4. Tabelas — scheduling

```sql
CREATE TABLE appointment_series (       -- DDL S2; HTTP create/delete escopo no Bloco 3
  id                uuid PRIMARY KEY,
  tenant_id         uuid NOT NULL,
  unit_id           uuid NOT NULL,
  patient_id        uuid NOT NULL REFERENCES patient(id),
  professional_id   uuid NOT NULL REFERENCES professional(id),
  chair_id          uuid REFERENCES chair(id),
  procedure_id      uuid REFERENCES procedure(id),
  rrule             text NOT NULL,
  starts_at         timestamptz NOT NULL,
  duration_minutes  smallint NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE appointment (
  id               uuid PRIMARY KEY,
  tenant_id        uuid NOT NULL,
  unit_id          uuid NOT NULL,
  patient_id       uuid NOT NULL REFERENCES patient(id),
  professional_id  uuid NOT NULL REFERENCES professional(id),
  chair_id         uuid REFERENCES chair(id),
  procedure_id     uuid REFERENCES procedure(id),
  treatment_item_id uuid,                            -- item do plano a executar (referência lógica)
  starts_at        timestamptz NOT NULL,
  ends_at          timestamptz NOT NULL,
  period           tstzrange GENERATED ALWAYS AS (tstzrange(starts_at, ends_at, '[)')) STORED,
  status           text NOT NULL DEFAULT 'SCHEDULED', -- REQUESTED|SCHEDULED|CONFIRMED|IN_SERVICE|COMPLETED|NO_SHOW|CANCELLED
  origin           text NOT NULL DEFAULT 'INTERNAL',  -- INTERNAL|PUBLIC_BOOKING|WAITLIST|RECURRENCE
  confirmed_at     timestamptz,
  arrived_at       timestamptz,
  cancelled_at     timestamptz,
  cancel_reason    text,
  recurrence_id    uuid REFERENCES appointment_series(id),
  notes            text,
  created_by       uuid,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);

ALTER TABLE appointment ADD CONSTRAINT appointment_professional_no_overlap
  EXCLUDE USING gist (tenant_id WITH =, professional_id WITH =, period WITH &&)
  WHERE (status NOT IN ('CANCELLED', 'NO_SHOW'));

ALTER TABLE appointment ADD CONSTRAINT appointment_chair_no_overlap
  EXCLUDE USING gist (tenant_id WITH =, chair_id WITH =, period WITH &&)
  WHERE (chair_id IS NOT NULL AND status NOT IN ('CANCELLED', 'NO_SHOW'));

CREATE INDEX idx_appointment_agenda  ON appointment (tenant_id, unit_id, starts_at);
CREATE INDEX idx_appointment_patient ON appointment (tenant_id, patient_id, starts_at DESC);

CREATE TABLE appointment_history (      -- append-only: quem mudou o quê
  id              uuid PRIMARY KEY,
  tenant_id       uuid NOT NULL,
  appointment_id  uuid NOT NULL REFERENCES appointment(id),
  action          text NOT NULL,        -- CREATED|RESCHEDULED|STATUS_CHANGED|CANCELLED
  from_value      jsonb,
  to_value        jsonb,
  actor_id        uuid,                 -- NULL = sistema/paciente
  actor_type      text NOT NULL,        -- USER|PATIENT|SYSTEM
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE schedule_block (
  id               uuid PRIMARY KEY,
  tenant_id        uuid NOT NULL,
  unit_id          uuid NOT NULL,
  professional_id  uuid REFERENCES professional(id),  -- NULL = unidade toda
  chair_id         uuid REFERENCES chair(id),
  starts_at        timestamptz NOT NULL,
  ends_at          timestamptz NOT NULL,
  period           tstzrange GENERATED ALWAYS AS (tstzrange(starts_at, ends_at, '[)')) STORED,
  reason           text NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE waitlist_entry (
  id                uuid PRIMARY KEY,
  tenant_id         uuid NOT NULL,
  unit_id           uuid NOT NULL,
  patient_id        uuid NOT NULL REFERENCES patient(id),
  professional_id   uuid REFERENCES professional(id),  -- NULL = qualquer
  procedure_id      uuid REFERENCES procedure(id),
  preferred_periods jsonb NOT NULL DEFAULT '[]',       -- [{weekday, from, to}]
  priority          smallint NOT NULL DEFAULT 0,
  status            text NOT NULL DEFAULT 'WAITING',   -- WAITING|OFFERED|SCHEDULED|EXPIRED|CANCELLED
  offered_at        timestamptz,
  expires_at        timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_waitlist_active ON waitlist_entry (tenant_id, status, priority DESC, created_at);

CREATE TABLE public_booking_token (     -- também usado para anamnese/orçamento por link
  id           uuid PRIMARY KEY,
  tenant_id    uuid NOT NULL,
  purpose      text NOT NULL,           -- BOOKING|CONFIRMATION|WAITLIST_OFFER|ANAMNESIS|QUOTE
  target_id    uuid,
  token_hash   text NOT NULL,
  expires_at   timestamptz NOT NULL,
  used_at      timestamptz,
  meta         jsonb,                   -- attempts, otp hash, snapshot de booking (IDs; sem clínico)
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_booking_token_hash ON public_booking_token (token_hash);
```

## 5. Tabelas — clinical-records

```sql
CREATE TABLE medical_record (           -- 1:1 com paciente; agrega o prontuário
  id           uuid PRIMARY KEY,
  tenant_id    uuid NOT NULL,
  patient_id   uuid NOT NULL REFERENCES patient(id),
  opened_at    timestamptz NOT NULL DEFAULT now(),
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, patient_id)
);

CREATE TABLE anamnesis_form (           -- questionário configurável pela clínica
  id           uuid PRIMARY KEY,
  tenant_id    uuid NOT NULL,
  name         text NOT NULL,
  version      integer NOT NULL DEFAULT 1,
  questions    jsonb NOT NULL,          -- [{id, label, type, options, alertWhen}]
  active       boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, name, version)
);

CREATE TABLE anamnesis_response (
  id                uuid PRIMARY KEY,
  tenant_id         uuid NOT NULL,
  medical_record_id uuid NOT NULL REFERENCES medical_record(id),
  form_id           uuid NOT NULL REFERENCES anamnesis_form(id),
  form_version      integer NOT NULL,
  answers           text NOT NULL,       -- ciphertext envelope v1 (JSON plaintext → AES-GCM → base64)
  answered_by       text NOT NULL,      -- PATIENT|PROFESSIONAL
  answered_at       timestamptz NOT NULL DEFAULT now(),
  signature         jsonb               -- {type: SIMPLE, ip, userAgent, hash}
);

CREATE TABLE clinical_alert (            -- derivado da anamnese ou manual
  id                uuid PRIMARY KEY,
  tenant_id         uuid NOT NULL,
  medical_record_id uuid NOT NULL REFERENCES medical_record(id),
  severity          text NOT NULL,       -- INFO|WARNING|CRITICAL
  category          text NOT NULL,       -- ALLERGY|CONDITION|MEDICATION|OTHER
  description       text NOT NULL,       -- ciphertext envelope v1
  source            text NOT NULL,       -- ANAMNESIS|MANUAL
  active            boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE tooth_state (               -- estado atual do odontograma (1 linha por dente/face)
  id                uuid PRIMARY KEY,
  tenant_id         uuid NOT NULL,
  medical_record_id uuid NOT NULL REFERENCES medical_record(id),
  dentition         text NOT NULL,       -- PERMANENT|DECIDUOUS
  tooth_code        text NOT NULL,       -- notação FDI: 11..48 / 51..85
  face              text,                -- M|D|V|L|O|C (NULL = dente inteiro)
  condition         text NOT NULL,       -- HEALTHY|CARIES|RESTORED|ABSENT|IMPLANT|CROWN|ROOT_CANAL|EXTRACTED|SEALANT|FRACTURE
  notes             text,
  recorded_by       uuid NOT NULL,
  recorded_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, medical_record_id, dentition, tooth_code, face)
);

CREATE TABLE tooth_state_history (       -- append-only: evolução do odontograma
  id             uuid PRIMARY KEY,
  tenant_id      uuid NOT NULL,
  tooth_state_id uuid NOT NULL,
  from_condition text,
  to_condition   text NOT NULL,
  source         text NOT NULL,          -- MANUAL|PROCEDURE_EXECUTION
  source_id      uuid,
  actor_id       uuid NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE clinical_note (             -- evolução clínica (imutável)
  id                uuid PRIMARY KEY,
  tenant_id         uuid NOT NULL,
  medical_record_id uuid NOT NULL REFERENCES medical_record(id),
  appointment_id    uuid,
  professional_id   uuid NOT NULL REFERENCES professional(id),
  content           text NOT NULL,                 -- ciphertext envelope v1 (ver §14)
  procedures        jsonb NOT NULL DEFAULT '[]',   -- [{procedureId, tooth, face}]
  version           integer NOT NULL DEFAULT 1,
  supersedes_id     uuid REFERENCES clinical_note(id),
  amend_reason      text,                          -- obrigatório quando version > 1
  content_hash      text NOT NULL,                 -- SHA-256 do plaintext canônico (antes de cifrar)
  signed_at         timestamptz NOT NULL DEFAULT now(),
  signature         jsonb NOT NULL,                -- {type, userId, croNumber, ip}
  created_at        timestamptz NOT NULL DEFAULT now(),
  CHECK (version = 1 OR amend_reason IS NOT NULL)
);
CREATE INDEX idx_clinical_note_record ON clinical_note (tenant_id, medical_record_id, created_at DESC);
-- Regra de imutabilidade garantida por trigger: UPDATE/DELETE bloqueados (exceto colunas de índice interno)

CREATE TABLE attachment (
  id                uuid PRIMARY KEY,
  tenant_id         uuid NOT NULL,
  medical_record_id uuid REFERENCES medical_record(id),
  patient_id        uuid NOT NULL,
  clinical_note_id  uuid REFERENCES clinical_note(id),
  category          text NOT NULL,       -- XRAY|PHOTO_INTRAORAL|PHOTO_FACIAL|DOCUMENT|EXAM|CONSENT_FORM|OTHER
  file_name         text NOT NULL,
  storage_key       text NOT NULL,
  mime_type         text NOT NULL,
  size_bytes        bigint NOT NULL,
  checksum_sha256   text NOT NULL,
  thumbnail_key     text,                -- miniatura (job); original intocado
  uploaded_by       uuid NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  deleted_at        timestamptz,
  deleted_reason    text,                -- obrigatório na exclusão lógica (≥10)
  deleted_by        uuid                 -- autor da exclusão lógica (RF-E5-15)
);
CREATE INDEX idx_attachment_patient ON attachment (tenant_id, patient_id, created_at DESC);
```

### Trigger de imutabilidade da evolução

```sql
CREATE OR REPLACE FUNCTION clinical_note_immutable() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'clinical_note is append-only; create a new version with supersedes_id';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_clinical_note_no_update
  BEFORE UPDATE OR DELETE ON clinical_note
  FOR EACH ROW EXECUTE FUNCTION clinical_note_immutable();
```

## 6. Tabelas — treatments

Número do orçamento é sequencial **por tenant** (`quote_number_counter`), não `IDENTITY` global (mesma lição de `patient.code`). Status de item: `PLANNED|SCHEDULED|EXECUTED|CANCELLED` (sem `IN_PROGRESS`).

```sql
CREATE TABLE quote_number_counter (
  tenant_id   uuid PRIMARY KEY REFERENCES tenant(id),
  last_number bigint NOT NULL DEFAULT 0
);

CREATE TABLE quote (                      -- orçamento
  id              uuid PRIMARY KEY,
  tenant_id       uuid NOT NULL,
  unit_id         uuid NOT NULL,
  patient_id      uuid NOT NULL REFERENCES patient(id),
  professional_id uuid NOT NULL REFERENCES professional(id),
  number          bigint NOT NULL,                     -- por tenant (quote_number_counter)
  status          text NOT NULL DEFAULT 'DRAFT',   -- DRAFT|SENT|APPROVED|PARTIALLY_APPROVED|REJECTED|EXPIRED|CANCELLED
  subtotal_cents  bigint NOT NULL DEFAULT 0,
  discount_cents  bigint NOT NULL DEFAULT 0,
  total_cents     bigint NOT NULL DEFAULT 0,
  valid_until     date,
  notes           text,
  sent_at         timestamptz,
  decided_at      timestamptz,
  decided_by      text,                            -- USER|PATIENT_LINK
  reject_reason   text,
  pdf_storage_key text,
  idempotency_key text,                            -- decisão; unique parcial (tenant_id, idempotency_key)
  duplicated_from_id uuid REFERENCES quote(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, number)
);

CREATE TABLE quote_item (
  id             uuid PRIMARY KEY,
  tenant_id      uuid NOT NULL,
  quote_id       uuid NOT NULL REFERENCES quote(id) ON DELETE CASCADE,
  procedure_id   uuid NOT NULL REFERENCES procedure(id),
  tooth_code     text,
  face           text,
  quantity       smallint NOT NULL DEFAULT 1,
  unit_price_cents bigint NOT NULL,
  discount_cents bigint NOT NULL DEFAULT 0,
  total_cents    bigint NOT NULL,
  approved       boolean NOT NULL DEFAULT true,     -- permite aprovação parcial
  sort_order     smallint NOT NULL DEFAULT 0
);

CREATE TABLE treatment_plan (
  id           uuid PRIMARY KEY,
  tenant_id    uuid NOT NULL,
  patient_id   uuid NOT NULL REFERENCES patient(id),
  quote_id     uuid REFERENCES quote(id),
  status       text NOT NULL DEFAULT 'ACTIVE',      -- ACTIVE|COMPLETED|CANCELLED
  started_at   timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE treatment_item (
  id                uuid PRIMARY KEY,
  tenant_id         uuid NOT NULL,
  treatment_plan_id uuid NOT NULL REFERENCES treatment_plan(id),
  procedure_id      uuid NOT NULL REFERENCES procedure(id),
  quote_item_id     uuid REFERENCES quote_item(id),
  tooth_code        text,
  face              text,
  price_cents       bigint NOT NULL,
  status            text NOT NULL DEFAULT 'PLANNED', -- PLANNED|SCHEDULED|EXECUTED|CANCELLED
  professional_id   uuid REFERENCES professional(id),
  executed_at       timestamptz,
  clinical_note_id  uuid REFERENCES clinical_note(id),
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_treatment_item_status ON treatment_item (tenant_id, treatment_plan_id, status);
```

## 7. Tabelas — billing (financeiro da clínica)

```sql
CREATE TABLE financial_category (
  id         uuid PRIMARY KEY,
  tenant_id  uuid NOT NULL,
  name       text NOT NULL,
  kind       text NOT NULL,          -- REVENUE|EXPENSE
  parent_id  uuid REFERENCES financial_category(id),
  active     boolean NOT NULL DEFAULT true,
  UNIQUE (tenant_id, name, kind)
);

CREATE TABLE receivable (             -- título a receber (pode ter N parcelas)
  id            uuid PRIMARY KEY,
  tenant_id     uuid NOT NULL,
  unit_id       uuid NOT NULL,
  patient_id    uuid NOT NULL REFERENCES patient(id),
  quote_id      uuid REFERENCES quote(id),
  treatment_plan_id uuid REFERENCES treatment_plan(id),
  total_cents   bigint NOT NULL,
  installments  smallint NOT NULL DEFAULT 1,
  status        text NOT NULL DEFAULT 'OPEN',   -- OPEN|PARTIALLY_PAID|PAID|CANCELLED
  category_id   uuid REFERENCES financial_category(id),
  description   text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE installment (
  id             uuid PRIMARY KEY,
  tenant_id      uuid NOT NULL,
  receivable_id  uuid NOT NULL REFERENCES receivable(id) ON DELETE CASCADE,
  number         smallint NOT NULL,
  due_date       date NOT NULL,
  amount_cents   bigint NOT NULL,
  paid_cents     bigint NOT NULL DEFAULT 0,
  status         text NOT NULL DEFAULT 'OPEN',  -- OPEN|PARTIALLY_PAID|PAID|OVERDUE|CANCELLED
  paid_at        timestamptz,
  UNIQUE (tenant_id, receivable_id, number)
);
CREATE INDEX idx_installment_due ON installment (tenant_id, due_date)
  WHERE status IN ('OPEN','PARTIALLY_PAID','OVERDUE');

-- Nº de recibo sequencial por tenant (não IDENTITY global; mesma lição de patient.code / quote.number).
CREATE TABLE receipt_number_counter (
  tenant_id   uuid PRIMARY KEY REFERENCES tenant(id),
  last_number bigint NOT NULL DEFAULT 0
);

CREATE TABLE cash_session (            -- caixa do dia por operador
  id              uuid PRIMARY KEY,
  tenant_id       uuid NOT NULL,
  unit_id         uuid NOT NULL,
  opened_by       uuid NOT NULL,
  opened_at       timestamptz NOT NULL DEFAULT now(),
  opening_cents   bigint NOT NULL DEFAULT 0,
  opening_by_method jsonb,             -- opcional: breakdown na abertura
  closed_by       uuid,
  closed_at       timestamptz,
  counted_cents   bigint,
  expected_cents  bigint,
  difference_cents bigint,
  counted_by_method jsonb,             -- [{method, countedCents}]
  expected_by_method jsonb,
  difference_reason text,
  status          text NOT NULL DEFAULT 'OPEN'    -- OPEN|CLOSED
);
CREATE UNIQUE INDEX uq_cash_session_open ON cash_session (tenant_id, unit_id, opened_by) WHERE status = 'OPEN';

-- Cabeçalho do recebimento. Formas ficam em payment_split (Σ split.amount_cents = payment.amount_cents).
CREATE TABLE payment (
  id              uuid PRIMARY KEY,
  tenant_id       uuid NOT NULL,
  unit_id         uuid NOT NULL,
  installment_id  uuid NOT NULL REFERENCES installment(id),
  cash_session_id uuid REFERENCES cash_session(id),  -- opcional; CASH exige sessão OPEN
  amount_cents    bigint NOT NULL,
  received_at     timestamptz NOT NULL DEFAULT now(),
  received_by     uuid NOT NULL,
  reversed_at     timestamptz,
  reversal_reason text,
  reversed_by     uuid,
  receipt_number  bigint NOT NULL,     -- receipt_number_counter por tenant
  pdf_storage_key text,                -- S6 recibo PDF (job após payment_registered)
  notes           text,
  idempotency_key text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, receipt_number)
);
CREATE UNIQUE INDEX uq_payment_idempotency ON payment (tenant_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX idx_payment_period ON payment (tenant_id, unit_id, received_at);

CREATE TABLE payment_split (
  id               uuid PRIMARY KEY,
  tenant_id        uuid NOT NULL,
  payment_id       uuid NOT NULL REFERENCES payment(id) ON DELETE CASCADE,
  method           text NOT NULL,      -- CASH|DEBIT_CARD|CREDIT_CARD|PIX|BANK_TRANSFER|CHECK|INSURANCE|PATIENT_CREDIT
  amount_cents     bigint NOT NULL,
  card_brand       text,
  installments_qty smallint
);

-- Crédito do paciente: só ledger com sinal. Saldo = SUM(amount_cents). Proibido campo saldo editável.
CREATE TABLE patient_credit_ledger (
  id           uuid PRIMARY KEY,
  tenant_id    uuid NOT NULL,
  patient_id   uuid NOT NULL REFERENCES patient(id),
  payment_id   uuid REFERENCES payment(id),
  amount_cents bigint NOT NULL,        -- sinal: CREDIT > 0; DEBIT < 0; REVERSE estorna o lançamento
  kind         text NOT NULL,          -- CREDIT|DEBIT|REVERSE
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE payable (
  id           uuid PRIMARY KEY,
  tenant_id    uuid NOT NULL,
  unit_id      uuid NOT NULL,
  category_id  uuid REFERENCES financial_category(id),
  supplier     text,
  description  text NOT NULL,
  amount_cents bigint NOT NULL,
  due_date     date NOT NULL,
  paid_at      timestamptz,
  paid_cents   bigint,
  method       text,                   -- mesmas formas do módulo (quando PAID)
  recurrence   jsonb,                  -- {frequency: MONTHLY, until: date}
  status       text NOT NULL DEFAULT 'OPEN',   -- OPEN|PAID|OVERDUE|CANCELLED
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE cash_movement (
  id              uuid PRIMARY KEY,
  tenant_id       uuid NOT NULL,
  cash_session_id uuid NOT NULL REFERENCES cash_session(id),
  kind            text NOT NULL,        -- SUPPLY|WITHDRAWAL|PAYMENT_IN|PAYMENT_OUT
  amount_cents    bigint NOT NULL,
  method          text NOT NULL,        -- mesmas formas do módulo
  payment_id      uuid REFERENCES payment(id),
  description     text,
  created_by      uuid NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE production_entry (         -- produção do profissional (base de comissão futura)
  id                uuid PRIMARY KEY,
  tenant_id         uuid NOT NULL,
  unit_id           uuid NOT NULL,
  professional_id   uuid NOT NULL REFERENCES professional(id),
  patient_id        uuid NOT NULL,
  treatment_item_id uuid REFERENCES treatment_item(id),
  procedure_id      uuid NOT NULL,
  amount_cents      bigint NOT NULL,
  executed_at       timestamptz NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_production_period ON production_entry (tenant_id, professional_id, executed_at);
```

## 8. Tabelas — messaging

```sql
CREATE TABLE whatsapp_account (
  id                 uuid PRIMARY KEY,
  tenant_id          uuid NOT NULL,
  unit_id            uuid,
  session_name       text NOT NULL,      -- sessão WAHA estável, ex. tenant_<uuid>
  display_phone      text,               -- preenchido após CONNECTED
  risk_accepted_at   timestamptz,        -- checkbox ToS/ban/número dedicado; QR só depois
  -- Reserva Cloud API (MESSAGING_PROVIDER=cloud); NULL no caminho WAHA:
  waba_id            text,
  phone_number_id    text,
  access_token_ref   text,               -- KMS; só adapter cloud
  webhook_verified_at timestamptz,
  status             text NOT NULL DEFAULT 'PENDING',  -- PENDING|CONNECTED|ERROR|DISCONNECTED
  kill_switch        boolean NOT NULL DEFAULT false,
  last_error         text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id),                    -- 1 conta / tenant no MVP
  UNIQUE (session_name)
);

CREATE TABLE message_template (
  id            uuid PRIMARY KEY,
  tenant_id     uuid,                  -- NULL = catálogo da plataforma
  key           text NOT NULL,         -- appointment_created|appointment_confirmation|…
  category      text NOT NULL,         -- MARKETING|UTILITY|AUTHENTICATION
  language      text NOT NULL DEFAULT 'pt_BR',
  provider_name text NOT NULL,         -- chave estável nossa (não nome aprovado na Meta)
  body          text NOT NULL,         -- texto renderizado pelo adapter WAHA
  variables     jsonb NOT NULL DEFAULT '[]',
  status        text NOT NULL DEFAULT 'ACTIVE',  -- ACTIVE (WAHA); APPROVED só se cloud por env
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE conversation (
  id                  uuid PRIMARY KEY,
  tenant_id           uuid NOT NULL,
  whatsapp_account_id uuid NOT NULL REFERENCES whatsapp_account(id),
  patient_id          uuid REFERENCES patient(id),  -- NULL = contato não identificado
  contact_phone       text NOT NULL,
  contact_name        text,
  status              text NOT NULL DEFAULT 'OPEN',  -- OPEN|PENDING|CLOSED
  assigned_to         uuid,
  service_window_expires_at timestamptz,             -- opcional UX “conversa recente”; NÃO é preço Meta (ADR-0016)
  last_message_at     timestamptz,
  unread_count        integer NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, whatsapp_account_id, contact_phone)
);
CREATE INDEX idx_conversation_inbox ON conversation (tenant_id, status, last_message_at DESC);

CREATE TABLE message (
  id                uuid PRIMARY KEY,
  tenant_id         uuid NOT NULL,
  conversation_id   uuid NOT NULL REFERENCES conversation(id),
  direction         text NOT NULL,       -- INBOUND|OUTBOUND
  type              text NOT NULL,       -- TEXT|TEMPLATE|IMAGE|DOCUMENT|AUDIO|INTERACTIVE
  template_id       uuid REFERENCES message_template(id),
  body              text,
  media_key         text,
  provider_message_id text,
  status            text NOT NULL DEFAULT 'QUEUED',  -- QUEUED|SENT|DELIVERED|READ|FAILED
  error_code        text,
  error_message     text,
  billable          boolean NOT NULL DEFAULT false,
  cost_cents        integer,
  related_type      text,                 -- APPOINTMENT|QUOTE|INSTALLMENT
  related_id        uuid,
  sent_by           uuid,                 -- NULL = automação
  idempotency_key   text,                 -- inbox send (S7); unique parcial (tenant_id, idempotency_key)
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_message_provider_id ON message (provider_message_id) WHERE provider_message_id IS NOT NULL;
CREATE UNIQUE INDEX uq_message_idempotency ON message (tenant_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX idx_message_conversation ON message (tenant_id, conversation_id, created_at);

CREATE TABLE automation (
  id           uuid PRIMARY KEY,
  tenant_id    uuid NOT NULL,
  key          text NOT NULL,          -- CONFIRMATION_D1|REMINDER_H3|BIRTHDAY|RECALL|DUNNING
  enabled      boolean NOT NULL DEFAULT true,
  config       jsonb NOT NULL,         -- {offsetHours, sendWindow, templateId}
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, key)
);

CREATE TABLE automation_run (
  id             uuid PRIMARY KEY,
  tenant_id      uuid NOT NULL,
  automation_id  uuid NOT NULL REFERENCES automation(id),
  target_type    text NOT NULL,
  target_id      uuid NOT NULL,
  scheduled_for  timestamptz NOT NULL,
  executed_at    timestamptz,
  result         text,                 -- SENT|SKIPPED_NO_CONSENT|SKIPPED_DISCONNECTED|SKIPPED_CANCELLED|FAILED
  message_id     uuid REFERENCES message(id),
  UNIQUE (tenant_id, automation_id, target_type, target_id)   -- idempotência (sem scheduled_for — alinhado a este doc; reschedule faz UPDATE do run)
);

CREATE TABLE message_credit_ledger (
  id           uuid PRIMARY KEY,
  tenant_id    uuid NOT NULL,
  kind         text NOT NULL,          -- PURCHASE|BONUS|CONSUMPTION|ADJUSTMENT
  amount_cents bigint NOT NULL,        -- positivo = crédito, negativo = consumo
  message_id   uuid REFERENCES message(id),
  balance_after_cents bigint NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);
-- Default WAHA: NÃO gravar consumo Meta. Tabela reserva se MESSAGING_PROVIDER=cloud.
```

Notas S3: `message_template` usa unique parcial (`key` WHERE `tenant_id IS NULL`; `(tenant_id, key)` WHERE `tenant_id IS NOT NULL`). RLS de template: `SELECT` permite `tenant_id IS NULL` + o tenant atual; escrita só do próprio tenant. `automation_run` unique **sem** `scheduled_for` (reschedule = UPDATE). Lookup webhook WAHA: `platform.resolve_whatsapp_account_by_session_name` (SECURITY DEFINER).

## 9. Tabelas — platform e subscription

```sql
CREATE TABLE tenant_crypto_key (         -- DEK wrapped por tenant (envelope); ver §14
  id              uuid PRIMARY KEY,
  tenant_id       uuid NOT NULL REFERENCES tenant(id),
  key_version     integer NOT NULL DEFAULT 1,
  algorithm       text NOT NULL DEFAULT 'AES-256-GCM',
  wrapped_dek     text NOT NULL,        -- DEK cifrada com KEK local (base64); nunca plaintext
  kek_provider    text NOT NULL DEFAULT 'local_vps',  -- local_vps|vault (futuro)
  status          text NOT NULL DEFAULT 'ACTIVE',     -- ACTIVE|ROTATING|RETIRED
  created_at      timestamptz NOT NULL DEFAULT now(),
  retired_at      timestamptz,
  UNIQUE (tenant_id, key_version)
);
CREATE UNIQUE INDEX uq_tenant_crypto_active
  ON tenant_crypto_key (tenant_id) WHERE status = 'ACTIVE';

CREATE TABLE outbox_event (
  id            uuid PRIMARY KEY,
  tenant_id     uuid NOT NULL,
  name          text NOT NULL,          -- 'scheduling.appointment_scheduled'
  payload       jsonb NOT NULL,
  occurred_at   timestamptz NOT NULL DEFAULT now(),
  processed_at  timestamptz,
  attempts      smallint NOT NULL DEFAULT 0,
  last_error    text
);
CREATE INDEX idx_outbox_pending ON outbox_event (processed_at, occurred_at) WHERE processed_at IS NULL;

CREATE TABLE audit_log (
  id            uuid PRIMARY KEY,
  tenant_id     uuid NOT NULL,
  actor_id      uuid,
  actor_type    text NOT NULL,          -- USER|PATIENT|SYSTEM|SUPPORT
  action        text NOT NULL,          -- READ|CREATE|UPDATE|DELETE|EXPORT|LOGIN|PERMISSION_DENIED
  resource_type text NOT NULL,
  resource_id   uuid,
  patient_id    uuid,                   -- facilita relatório de acesso por paciente (LGPD)
  ip_address    inet,
  user_agent    text,
  metadata      jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_tenant_time ON audit_log (tenant_id, created_at DESC);
CREATE INDEX idx_audit_patient ON audit_log (tenant_id, patient_id, created_at DESC) WHERE patient_id IS NOT NULL;

CREATE TABLE data_subject_request (     -- LGPD: solicitações do titular
  id           uuid PRIMARY KEY,
  tenant_id    uuid NOT NULL,
  patient_id   uuid REFERENCES patient(id),
  type         text NOT NULL,           -- ACCESS|CORRECTION|DELETION|PORTABILITY|REVOKE_CONSENT
  status       text NOT NULL DEFAULT 'RECEIVED',  -- RECEIVED|IN_PROGRESS|COMPLETED|REJECTED
  requested_at timestamptz NOT NULL DEFAULT now(),
  due_at       timestamptz NOT NULL,
  completed_at timestamptz,
  handled_by   uuid,
  resolution   text,
  export_key   text
);

CREATE TABLE plan (
  id            uuid PRIMARY KEY,
  code          text NOT NULL UNIQUE,   -- ESSENCIAL|CLINICA|REDE
  name          text NOT NULL,
  price_cents   bigint NOT NULL,
  interval      text NOT NULL,          -- MONTHLY|YEARLY
  limits        jsonb NOT NULL,         -- {professionals, adminUsers, units, storageGb, messagesMonth}
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE subscription (
  id                 uuid PRIMARY KEY,
  tenant_id          uuid NOT NULL UNIQUE REFERENCES tenant(id),
  plan_id            uuid NOT NULL REFERENCES plan(id),
  status             text NOT NULL,     -- TRIAL|ACTIVE|PAST_DUE|SUSPENDED|EXPIRED|CANCELLED
  trial_ends_at      timestamptz,
  current_period_end timestamptz,
  external_customer_id text,
  external_subscription_id text,
  cancel_at          timestamptz,
  billing_method     text,               -- PIX|BOLETO|CREDIT_CARD (null = manual) — ADR-0017
  billing_provider   text NOT NULL DEFAULT 'MANUAL',   -- ASAAS|MANUAL
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE subscription_payment (      -- espelho das cobranças do Asaas (RLS tenant) — S9
  id                  uuid PRIMARY KEY,
  tenant_id           uuid NOT NULL REFERENCES tenant(id),
  subscription_id     uuid NOT NULL REFERENCES subscription(id) ON DELETE CASCADE,
  external_payment_id text NOT NULL UNIQUE,
  status              text NOT NULL,     -- status do Asaas (PENDING|CONFIRMED|RECEIVED|OVERDUE|REFUNDED|…)
  value_cents         bigint NOT NULL,
  due_date            date NOT NULL,
  paid_at             timestamptz,
  billing_type        text,
  invoice_url         text,
  bank_slip_url       text,
  deleted             boolean NOT NULL DEFAULT false,
  last_event_at       timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE subscription_checkout (     -- tentativa de checkout, idempotente por (tenant, chave) — S9
  id                   uuid PRIMARY KEY,
  tenant_id            uuid NOT NULL REFERENCES tenant(id),
  idempotency_key      text NOT NULL,
  plan_id              uuid NOT NULL REFERENCES plan(id),
  billing_method       text NOT NULL,    -- PIX|BOLETO|CREDIT_CARD
  status               text NOT NULL DEFAULT 'PENDING',   -- PENDING|PAID|CANCELED|EXPIRED|FAILED
  external_checkout_id text UNIQUE,
  url                  text,
  expires_at           timestamptz,
  UNIQUE (tenant_id, idempotency_key)
);

-- schema platform, SEM RLS de tenant (o webhook chega sem contexto de tenant):
CREATE TABLE platform.asaas_link (       -- tenant ↔ ids do Asaas
  tenant_id                uuid PRIMARY KEY REFERENCES tenant(id) ON DELETE CASCADE,
  external_customer_id     text UNIQUE,
  external_subscription_id text UNIQUE
);

CREATE TABLE platform.asaas_event (      -- inbox do webhook; UNIQUE(asaas_event_id) = idempotência
  id             uuid PRIMARY KEY,
  asaas_event_id text NOT NULL UNIQUE,
  event          text NOT NULL,
  tenant_id      uuid,
  payload        jsonb NOT NULL,         -- sem dado de cartão
  status         text NOT NULL DEFAULT 'PENDING',   -- PENDING|DONE|FAILED
  attempts       int NOT NULL DEFAULT 0,
  last_error     text,
  received_at    timestamptz NOT NULL DEFAULT now(),
  processed_at   timestamptz
);

CREATE TABLE usage_counter (
  id           uuid PRIMARY KEY,
  tenant_id    uuid NOT NULL,
  metric       text NOT NULL,          -- professionals|admin_users|units|messages_month|storage_bytes|patients
  period       text NOT NULL,          -- '2026-08' ou 'CURRENT'
  value        bigint NOT NULL DEFAULT 0,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, metric, period)
);

CREATE TABLE report_export (            -- E9 export assíncrono (S7)
  id            uuid PRIMARY KEY,
  tenant_id     uuid NOT NULL REFERENCES tenant(id),
  report        text NOT NULL,          -- dashboard|no-shows|revenue|procedures
  format        text NOT NULL,          -- CSV|XLSX
  status        text NOT NULL DEFAULT 'PENDING',  -- PENDING|RUNNING|READY|FAILED
  filters       jsonb NOT NULL DEFAULT '{}',
  storage_key   text,
  requested_by  uuid NOT NULL,
  error         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  completed_at  timestamptz
);
CREATE INDEX idx_report_export_tenant_created ON report_export (tenant_id, created_at DESC);
```

## 10. Views de leitura (contrato do módulo `reporting`)

```sql
CREATE VIEW vw_agenda_day AS
SELECT a.tenant_id, a.unit_id, a.id AS appointment_id, a.starts_at, a.ends_at, a.status,
       p.id AS patient_id, p.name AS patient_name, p.phone_primary,
       pr.id AS professional_id, u.name AS professional_name,
       proc.name AS procedure_name, c.name AS chair_name
FROM appointment a
JOIN patient p       ON p.id = a.patient_id
JOIN professional pr ON pr.id = a.professional_id
JOIN membership m    ON m.id = pr.membership_id
JOIN "user" u        ON u.id = m.user_id
LEFT JOIN procedure proc ON proc.id = a.procedure_id
LEFT JOIN chair c    ON c.id = a.chair_id;

CREATE VIEW vw_financial_summary_month AS
SELECT tenant_id, unit_id, date_trunc('month', received_at) AS month,
       SUM(amount_cents) FILTER (WHERE reversed_at IS NULL) AS received_cents
FROM payment GROUP BY 1, 2, 3;

CREATE VIEW vw_no_show_rate AS
SELECT tenant_id, unit_id, date_trunc('month', starts_at) AS month,
       COUNT(*) FILTER (WHERE status = 'NO_SHOW')::numeric
         / NULLIF(COUNT(*) FILTER (WHERE status IN ('COMPLETED','NO_SHOW')), 0) AS no_show_rate
FROM appointment GROUP BY 1, 2, 3;
```

Views herdam a RLS das tabelas base (são `security_invoker` por padrão nas versões atuais do PostgreSQL; declare explicitamente `WITH (security_invoker = true)` para não depender do default).

## 11. Regras de integridade que **não** ficam só na aplicação

| Regra | Mecanismo |
| --- | --- |
| Sem double-booking por profissional/cadeira | `EXCLUDE USING gist` |
| Evolução clínica imutável | trigger `BEFORE UPDATE OR DELETE` |
| Soma das parcelas = total do título | trigger de validação `AFTER INSERT/UPDATE` em `installment` (deferrable) ou verificação no caso de uso + teste |
| Uma unidade padrão por tenant | índice único parcial |
| Um caixa aberto por operador/unidade | índice único parcial |
| Unicidade de CPF por tenant | índice único parcial |
| Idempotência de automação | `UNIQUE (tenant_id, automation_id, target_type, target_id)` |
| Idempotência de webhook | `UNIQUE (provider_message_id)` |
| Isolamento entre tenants | RLS (doc 06) |

## 12. Migrações

- Prisma Migrate com migrações versionadas em `backend/prisma/migrations`.
- Todo recurso não suportado pelo Prisma (RLS, `EXCLUDE`, triggers, views, colunas geradas, extensões) entra como **SQL manual** dentro da migração gerada.
- Extensões necessárias: `pgcrypto` (ou UUID v7 gerado na aplicação), `citext`, `btree_gist`, `pg_trgm`.
- Política: migração sempre compatível para frente (expand/contract). Nunca `DROP COLUMN` no mesmo deploy que remove o uso — duas etapas.
- Seeds: catálogo padrão de procedimentos, planos, templates globais de mensagem, formulário de anamnese padrão.

## 13. Retenção e volumetria estimada (500 tenants, ano 1)

| Tabela | Linhas estimadas | Observação |
| --- | --- | --- |
`appointment` | ~2,4 M | 500 tenants × 400/mês × 12
`message` | ~6 M | 2–3 mensagens por agendamento + inbox
`audit_log` | ~30 M | maior tabela; particionar por mês e arquivar após 12 meses
`clinical_note` | ~1,5 M | crescimento permanente (não expira)
`attachment` | ~1 M / 40 TB? não — cota por plano mantém ~50–200 GB no ano 1 | imagens dominam o custo de storage
`payment`/`installment` | ~5 M | —

Decisões derivadas: particionar `audit_log` e `message` por mês; anexos em object storage com classe infrequente após 180 dias; prontuário nunca em storage "frio" inacessível (precisa de leitura imediata).

## 14. Envelope encryption — `tenant_crypto_key` e formato de ciphertext

Decisão de produto: [ADR-0007](./adr/0007-criptografia-envelope-tenant.md), [ADR-0013](./adr/0013-kms-local-vps.md), [doc 17](./17-seguranca-baseline.md) §3.

### 14.1 Tabela de chaves por tenant

Uma linha **ACTIVE** por tenant (índice único parcial). A DEK em plaintext **nunca** é persistida — só `wrapped_dek` (DEK cifrada com a KEK local da VPS).

### 14.2 Formato de coluna cifrada (MVP)

Colunas afetadas: `clinical_note.content`, `anamnesis_response.answers`, `clinical_alert.description` — tipo `text`.

Valor armazenado = **string Base64** de um blob versionado:

```
bytes = version(1) || nonce(12) || ciphertext(N) || tag(16)
coluna = Base64(bytes)
```

| Parte | Tamanho | Função |
| --- | --- | --- |
| `version` | 1 byte | `0x01` = v1 (permite evoluir o formato depois) |
| `nonce` | 12 bytes | aleatório único por encrypt (GCM) |
| `ciphertext` | N bytes | texto original cifrado (AES-256-GCM) |
| `tag` | 16 bytes | autenticação GCM (detecta adulteração) |

**AAD** (Additional Authenticated Data, não fica dentro do blob, mas entra no GCM):

```
aad = `${tenantId}|${table}|${column}|${rowId}`
```

Exemplo: `a1b2…|clinical_note|content|c9d8…`

Regras:

1. Algoritmo: **AES-256-GCM**; DEK de 32 bytes por tenant.
2. `content_hash` (evolução) = SHA-256 do **plaintext canônico**, calculado **antes** de cifrar; fica em plaintext.
3. Decrypt só depois de contexto de tenant (RLS) + RBAC.
4. Não usar `jsonb` para o envelope — evita índice/consulta acidental sobre ciphertext e mantém um único parser na app.
5. Trocar KEK = rewrap das DEK (sem re-cifrar campos). Trocar DEK = job assíncrono (fase 2).
