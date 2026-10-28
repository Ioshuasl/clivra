-- Qual modelo de anamnese cada profissional usa (sem registro = modelo geral da clínica).
CREATE TABLE "anamnesis_form_assignment" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "professional_id" UUID NOT NULL,
  "form_name" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "anamnesis_form_assignment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "anamnesis_form_assignment_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "uq_anamnesis_form_assignment_professional"
  ON "anamnesis_form_assignment" ("tenant_id", "professional_id");

SELECT platform.enable_tenant_rls('anamnesis_form_assignment');

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "anamnesis_form_assignment" TO app_user;
