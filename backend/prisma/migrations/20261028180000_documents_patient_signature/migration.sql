-- Documentos (Bloco 4): assinatura do paciente por link público (aceite simples ou código).

-- Como a clínica colhe a assinatura do paciente (uma linha por clínica).
CREATE TABLE "document_setting" (
  "tenant_id" UUID NOT NULL,
  "patient_signature_method" TEXT NOT NULL DEFAULT 'ACCEPT',
  "updated_by" UUID,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "document_setting_pkey" PRIMARY KEY ("tenant_id"),
  CONSTRAINT "document_setting_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "document_setting_method_check"
    CHECK ("patient_signature_method" IN ('ACCEPT', 'WHATSAPP_CODE'))
);

-- Pedido de assinatura: o link (só o hash fica no banco) e o código de confirmação (só o hash).
CREATE TABLE "document_signature_request" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "document_id" UUID NOT NULL,
  "token_hash" TEXT NOT NULL,
  "method" TEXT NOT NULL,
  "expires_at" TIMESTAMPTZ NOT NULL,
  "used_at" TIMESTAMPTZ,
  "revoked_at" TIMESTAMPTZ,
  "code_hash" TEXT,
  "code_expires_at" TIMESTAMPTZ,
  "code_attempts" INTEGER NOT NULL DEFAULT 0,
  "code_sent_via" TEXT,
  "created_by" UUID NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "document_signature_request_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "document_signature_request_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "document_signature_request_document_id_fkey"
    FOREIGN KEY ("document_id") REFERENCES "document"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "document_signature_request_method_check"
    CHECK ("method" IN ('ACCEPT', 'WHATSAPP_CODE'))
);

CREATE UNIQUE INDEX "uq_document_signature_request_token" ON "document_signature_request" ("token_hash");
CREATE INDEX "idx_document_signature_request_document"
  ON "document_signature_request" ("tenant_id", "document_id", "created_at" DESC);

-- Resolve o link público sem conhecer a clínica (a rota pública só tem o token).
CREATE OR REPLACE FUNCTION platform.resolve_document_signature_request(p_token_hash text)
RETURNS TABLE (
  id uuid,
  tenant_id uuid,
  document_id uuid,
  method text,
  expires_at timestamptz,
  used_at timestamptz,
  revoked_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id, r.tenant_id, r.document_id, r.method, r.expires_at, r.used_at, r.revoked_at
  FROM document_signature_request r
  WHERE r.token_hash = p_token_hash
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION platform.resolve_document_signature_request(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION platform.resolve_document_signature_request(text) TO app_user;

SELECT platform.enable_tenant_rls('document_setting');
SELECT platform.enable_tenant_rls('document_signature_request');

GRANT SELECT, INSERT, UPDATE ON TABLE "document_setting" TO app_user;
GRANT SELECT, INSERT, UPDATE ON TABLE "document_signature_request" TO app_user;

-- Mensagens de WhatsApp (modelos globais): link para assinar e código de confirmação.
INSERT INTO "message_template" (
  "id", "tenant_id", "key", "category", "language", "provider_name", "body", "variables", "status"
) VALUES
(
  'a1000000-0000-4000-8000-000000000020',
  NULL,
  'document_signature_request',
  'UTILITY',
  'pt_BR',
  'document_signature_request',
  'Olá {{nome}}, a {{clinica}} enviou um documento para você assinar: {{link}}',
  '["nome","clinica","link"]'::jsonb,
  'ACTIVE'
),
(
  'a1000000-0000-4000-8000-000000000021',
  NULL,
  'document_signature_code',
  'AUTHENTICATION',
  'pt_BR',
  'document_signature_code',
  'Seu código para assinar o documento da {{clinica}} é {{codigo}}. Ele vale por 10 minutos. Não compartilhe.',
  '["clinica","codigo"]'::jsonb,
  'ACTIVE'
)
ON CONFLICT DO NOTHING;
