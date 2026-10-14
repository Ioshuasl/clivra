-- Parâmetro da clínica: agenda/cadastro por cadeira (default desligado).
ALTER TABLE "tenant"
  ADD COLUMN "chairs_enabled" BOOLEAN NOT NULL DEFAULT false;
