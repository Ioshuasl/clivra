-- Documentos (Bloco 6): contrato gerado junto do orçamento aprovado.

-- Qual modelo de contrato a clínica usa nos orçamentos e se ele é gerado sozinho na aprovação.
ALTER TABLE "document_setting"
  ADD COLUMN "quote_contract_template_id" UUID,
  ADD COLUMN "quote_contract_auto" BOOLEAN NOT NULL DEFAULT false,
  ADD CONSTRAINT "document_setting_quote_template_fkey"
    FOREIGN KEY ("quote_contract_template_id") REFERENCES "document_template"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Um orçamento tem no máximo um contrato ativo (o cancelado não conta).
CREATE UNIQUE INDEX "uq_document_active_quote"
  ON "document" ("tenant_id", "quote_id")
  WHERE "quote_id" IS NOT NULL AND "status" <> 'CANCELLED';
