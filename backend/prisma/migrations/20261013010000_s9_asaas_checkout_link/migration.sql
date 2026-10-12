-- S9: vínculo checkout do Asaas -> tenant. O checkout de cartão é criado SEM `customer`
-- (o Asaas coleta os dados do pagador), então o webhook precisa achar o tenant pelo id do checkout.
CREATE TABLE platform.asaas_checkout_link (
  "external_checkout_id" TEXT NOT NULL,
  "tenant_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "asaas_checkout_link_pkey" PRIMARY KEY ("external_checkout_id"),
  CONSTRAINT "asaas_checkout_link_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES public."tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "idx_asaas_checkout_link_tenant" ON platform.asaas_checkout_link ("tenant_id");

GRANT SELECT, INSERT ON TABLE platform.asaas_checkout_link TO app_user;
