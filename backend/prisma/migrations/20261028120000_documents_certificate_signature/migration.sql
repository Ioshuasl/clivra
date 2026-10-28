-- Documentos (Bloco 3): certificado A1 do profissional + assinaturas do documento.

-- Certificado A1 (.pfx) do profissional. O arquivo fica criptografado (DEK do tenant) e
-- continua protegido pela senha do próprio certificado, que NUNCA é gravada.
CREATE TABLE "professional_certificate" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "professional_id" UUID NOT NULL,
  "pfx_encrypted" TEXT NOT NULL,
  "subject_name" TEXT NOT NULL,
  "issuer_name" TEXT NOT NULL,
  "serial_number" TEXT NOT NULL,
  "fingerprint_sha256" TEXT NOT NULL,
  "not_before" TIMESTAMPTZ NOT NULL,
  "not_after" TIMESTAMPTZ NOT NULL,
  "uploaded_by" UUID NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "professional_certificate_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "professional_certificate_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "professional_certificate_professional_id_fkey"
    FOREIGN KEY ("professional_id") REFERENCES "professional"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "uq_professional_certificate_professional"
  ON "professional_certificate" ("tenant_id", "professional_id");

-- Assinaturas do documento (append-only): quem assinou, como e com qual PDF assinado.
CREATE TABLE "document_signature" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "document_id" UUID NOT NULL,
  "signer_type" TEXT NOT NULL,
  "method" TEXT NOT NULL,
  "professional_id" UUID,
  "signer_name" TEXT NOT NULL,
  "certificate_subject" TEXT,
  "certificate_serial" TEXT,
  "certificate_not_after" TIMESTAMPTZ,
  "signed_pdf_key" TEXT,
  "signed_pdf_sha256" TEXT,
  "evidence" JSONB,
  "signed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "document_signature_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "document_signature_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "document_signature_document_id_fkey"
    FOREIGN KEY ("document_id") REFERENCES "document"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "document_signature_professional_id_fkey"
    FOREIGN KEY ("professional_id") REFERENCES "professional"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "document_signature_signer_type_check"
    CHECK ("signer_type" IN ('PROFESSIONAL', 'PATIENT', 'GUARDIAN')),
  CONSTRAINT "document_signature_method_check"
    CHECK ("method" IN ('ICP_A1', 'PATIENT_ACCEPT', 'PATIENT_WHATSAPP_CODE'))
);

CREATE INDEX "idx_document_signature_document" ON "document_signature" ("tenant_id", "document_id");
-- Um documento recebe no máximo uma assinatura do profissional.
CREATE UNIQUE INDEX "uq_document_signature_professional"
  ON "document_signature" ("document_id") WHERE "signer_type" = 'PROFESSIONAL';

CREATE OR REPLACE FUNCTION document_signature_immutable() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'document_signature is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_document_signature_immutable
  BEFORE UPDATE OR DELETE ON "document_signature"
  FOR EACH ROW EXECUTE FUNCTION document_signature_immutable();

SELECT platform.enable_tenant_rls('professional_certificate');
SELECT platform.enable_tenant_rls('document_signature');

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "professional_certificate" TO app_user;
GRANT SELECT, INSERT ON TABLE "document_signature" TO app_user;
