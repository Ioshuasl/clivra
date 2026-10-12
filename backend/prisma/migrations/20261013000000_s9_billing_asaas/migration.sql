-- S9 Bloco 1: cobrança automática da assinatura SaaS via Asaas (ADR-0017).
-- Tabelas de tenant com RLS; vínculo e eventos do Asaas em platform.* (sem RLS de tenant).

ALTER TABLE "subscription" ADD COLUMN "billing_method" TEXT;
ALTER TABLE "subscription" ADD COLUMN "billing_provider" TEXT NOT NULL DEFAULT 'MANUAL';
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_billing_method_check"
  CHECK ("billing_method" IS NULL OR "billing_method" IN ('PIX', 'BOLETO', 'CREDIT_CARD'));
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_billing_provider_check"
  CHECK ("billing_provider" IN ('ASAAS', 'MANUAL'));

CREATE TABLE "subscription_payment" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "subscription_id" UUID NOT NULL,
  "external_payment_id" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "value_cents" BIGINT NOT NULL,
  "due_date" DATE NOT NULL,
  "paid_at" TIMESTAMPTZ,
  "billing_type" TEXT,
  "invoice_url" TEXT,
  "bank_slip_url" TEXT,
  "deleted" BOOLEAN NOT NULL DEFAULT false,
  "last_event_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "subscription_payment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "subscription_payment_external_payment_id_key" UNIQUE ("external_payment_id"),
  CONSTRAINT "subscription_payment_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "subscription_payment_subscription_id_fkey"
    FOREIGN KEY ("subscription_id") REFERENCES "subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "idx_subscription_payment_tenant_due"
  ON "subscription_payment" ("tenant_id", "due_date" DESC);
CREATE INDEX "idx_subscription_payment_subscription"
  ON "subscription_payment" ("subscription_id");

CREATE TABLE "subscription_checkout" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "idempotency_key" TEXT NOT NULL,
  "plan_id" UUID NOT NULL,
  "billing_method" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "external_checkout_id" TEXT,
  "url" TEXT,
  "expires_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "subscription_checkout_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "subscription_checkout_external_checkout_id_key" UNIQUE ("external_checkout_id"),
  CONSTRAINT "uq_subscription_checkout_idempotency" UNIQUE ("tenant_id", "idempotency_key"),
  CONSTRAINT "subscription_checkout_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "subscription_checkout_plan_id_fkey"
    FOREIGN KEY ("plan_id") REFERENCES "plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "subscription_checkout_status_check"
    CHECK ("status" IN ('PENDING', 'PAID', 'CANCELED', 'EXPIRED', 'FAILED')),
  CONSTRAINT "subscription_checkout_method_check"
    CHECK ("billing_method" IN ('PIX', 'BOLETO', 'CREDIT_CARD'))
);

SELECT platform.enable_tenant_rls('subscription_payment');
SELECT platform.enable_tenant_rls('subscription_checkout');

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "subscription_payment" TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "subscription_checkout" TO app_user;

-- Vínculo tenant <-> ids do Asaas. Sem RLS: o webhook chega sem contexto de tenant (ADR-0017 §4).
CREATE TABLE platform.asaas_link (
  "tenant_id" UUID NOT NULL,
  "external_customer_id" TEXT,
  "external_subscription_id" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "asaas_link_pkey" PRIMARY KEY ("tenant_id"),
  CONSTRAINT "asaas_link_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES public."tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "uq_asaas_link_customer"
  ON platform.asaas_link ("external_customer_id") WHERE "external_customer_id" IS NOT NULL;
CREATE UNIQUE INDEX "uq_asaas_link_subscription"
  ON platform.asaas_link ("external_subscription_id") WHERE "external_subscription_id" IS NOT NULL;

-- Eventos recebidos do webhook (at-least-once): UNIQUE no id do evento garante idempotência.
CREATE TABLE platform.asaas_event (
  "id" UUID NOT NULL,
  "asaas_event_id" TEXT NOT NULL,
  "event" TEXT NOT NULL,
  "tenant_id" UUID,
  "payload" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "last_error" TEXT,
  "received_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processed_at" TIMESTAMPTZ,
  CONSTRAINT "asaas_event_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "asaas_event_asaas_event_id_key" UNIQUE ("asaas_event_id"),
  CONSTRAINT "asaas_event_status_check" CHECK ("status" IN ('PENDING', 'DONE', 'FAILED'))
);

CREATE INDEX "idx_asaas_event_status_received"
  ON platform.asaas_event ("status", "received_at");

GRANT SELECT, INSERT, UPDATE ON TABLE platform.asaas_link TO app_user;
GRANT SELECT, INSERT, UPDATE ON TABLE platform.asaas_event TO app_user;
