-- Documentos (Bloco 1): modelos editáveis + documentos emitidos imutáveis.

CREATE TABLE "document_template" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "kind" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "content" JSONB NOT NULL,
  "professional_signature" TEXT NOT NULL DEFAULT 'NONE',
  "patient_signature" TEXT NOT NULL DEFAULT 'NONE',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "system_key" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "document_template_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "document_template_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "document_template_kind_check"
    CHECK ("kind" IN ('PRESCRIPTION', 'CERTIFICATE', 'CONSENT_TERM', 'CONTRACT', 'OTHER')),
  CONSTRAINT "document_template_professional_signature_check"
    CHECK ("professional_signature" IN ('NONE', 'OPTIONAL', 'REQUIRED')),
  CONSTRAINT "document_template_patient_signature_check"
    CHECK ("patient_signature" IN ('NONE', 'OPTIONAL', 'REQUIRED'))
);

CREATE INDEX "idx_document_template_kind" ON "document_template" ("tenant_id", "kind", "active");
CREATE UNIQUE INDEX "uq_document_template_system_key"
  ON "document_template" ("tenant_id", "system_key") WHERE "system_key" IS NOT NULL;

CREATE TABLE "document" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "patient_id" UUID NOT NULL,
  "professional_id" UUID NOT NULL,
  "template_id" UUID,
  "kind" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" JSONB NOT NULL,
  "content_hash" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ISSUED',
  "professional_signature" TEXT NOT NULL,
  "patient_signature" TEXT NOT NULL,
  "pdf_key" TEXT,
  "pdf_sha256" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "supersedes_id" UUID,
  "amend_reason" TEXT,
  "appointment_id" UUID,
  "quote_id" UUID,
  "issued_by" UUID NOT NULL,
  "issued_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "cancelled_at" TIMESTAMPTZ,
  "cancelled_by" UUID,
  "cancel_reason" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "document_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "document_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "document_patient_id_fkey"
    FOREIGN KEY ("patient_id") REFERENCES "patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "document_professional_id_fkey"
    FOREIGN KEY ("professional_id") REFERENCES "professional"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "document_template_id_fkey"
    FOREIGN KEY ("template_id") REFERENCES "document_template"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "document_supersedes_id_fkey"
    FOREIGN KEY ("supersedes_id") REFERENCES "document"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "document_kind_check"
    CHECK ("kind" IN ('PRESCRIPTION', 'CERTIFICATE', 'CONSENT_TERM', 'CONTRACT', 'OTHER')),
  CONSTRAINT "document_status_check"
    CHECK ("status" IN ('ISSUED', 'AWAITING_SIGNATURE', 'SIGNED', 'CANCELLED')),
  CONSTRAINT "document_professional_signature_check"
    CHECK ("professional_signature" IN ('NONE', 'OPTIONAL', 'REQUIRED')),
  CONSTRAINT "document_patient_signature_check"
    CHECK ("patient_signature" IN ('NONE', 'OPTIONAL', 'REQUIRED')),
  CONSTRAINT "document_version_amend_check"
    CHECK (("version" = 1 AND "supersedes_id" IS NULL) OR ("version" > 1 AND "supersedes_id" IS NOT NULL))
);

CREATE INDEX "idx_document_patient" ON "document" ("tenant_id", "patient_id", "issued_at" DESC);

-- Conteúdo emitido não muda: só status, PDF e cancelamento podem ser atualizados.
CREATE OR REPLACE FUNCTION document_immutable() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'document cannot be deleted; cancel it instead';
  END IF;
  IF NEW."content" IS DISTINCT FROM OLD."content"
     OR NEW."content_hash" IS DISTINCT FROM OLD."content_hash"
     OR NEW."title" IS DISTINCT FROM OLD."title"
     OR NEW."kind" IS DISTINCT FROM OLD."kind"
     OR NEW."patient_id" IS DISTINCT FROM OLD."patient_id"
     OR NEW."professional_id" IS DISTINCT FROM OLD."professional_id"
     OR NEW."template_id" IS DISTINCT FROM OLD."template_id"
     OR NEW."version" IS DISTINCT FROM OLD."version"
     OR NEW."supersedes_id" IS DISTINCT FROM OLD."supersedes_id"
     OR NEW."issued_by" IS DISTINCT FROM OLD."issued_by"
     OR NEW."issued_at" IS DISTINCT FROM OLD."issued_at" THEN
    RAISE EXCEPTION 'document content is immutable; issue a new version with supersedes_id';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_document_immutable
  BEFORE UPDATE OR DELETE ON "document"
  FOR EACH ROW EXECUTE FUNCTION document_immutable();

SELECT platform.enable_tenant_rls('document_template');
SELECT platform.enable_tenant_rls('document');

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "document_template" TO app_user;
GRANT SELECT, INSERT, UPDATE ON TABLE "document" TO app_user;
