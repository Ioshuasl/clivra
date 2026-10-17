-- Os planos criados pela migração s7_subscription usavam as chaves "users" e "monthlyMessages",
-- mas o código lê "adminUsers" e "messagesMonth" (chave ausente = ilimitado).
-- Normaliza o catálogo global de planos; idempotente.
UPDATE "plan" SET "limits" = '{"professionals":1,"adminUsers":2,"units":1,"storageGb":5,"messagesMonth":null}'::jsonb
  WHERE "code" = 'ESSENCIAL';
UPDATE "plan" SET "limits" = '{"professionals":5,"adminUsers":6,"units":1,"storageGb":25,"messagesMonth":null}'::jsonb
  WHERE "code" = 'CLINICA';
UPDATE "plan" SET "limits" = '{"professionals":null,"adminUsers":null,"units":5,"storageGb":100,"messagesMonth":null}'::jsonb
  WHERE "code" = 'REDE';
