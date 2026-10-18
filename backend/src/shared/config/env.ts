import { config } from 'dotenv';
import { resolve } from 'node:path';
import { z } from 'zod';

config({ path: resolve(process.cwd(), '../.env') });
config({ path: resolve(process.cwd(), '.env') });

/** Decodifica chave PEM de env (Base64 ou PEM literal com \\n). */
export function decodePemKey(value: string): string {
  if (value.includes('BEGIN')) {
    return value.replace(/\\n/g, '\n');
  }
  return Buffer.from(value, 'base64').toString('utf8');
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3333),
  WORKER_HEALTH_PORT: z.coerce.number().default(3334),
  DATABASE_URL: z.string().min(1),
  DATABASE_MIGRATION_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  JWT_PRIVATE_KEY: z.string().min(1),
  JWT_PUBLIC_KEY: z.string().min(1),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().default(30),
  STORAGE_ENDPOINT: z.string().url(),
  STORAGE_BUCKET: z.string().min(1),
  STORAGE_REGION: z.string().default('sa-east-1'),
  STORAGE_ACCESS_KEY: z.string().min(1),
  STORAGE_SECRET_KEY: z.string().min(1),
  ATTACHMENT_QUOTA_BYTES: z.coerce.number().int().positive().default(1_073_741_824),
  WHATSAPP_APP_SECRET: z.string().min(1),
  WHATSAPP_VERIFY_TOKEN: z.string().min(1),
  MESSAGING_PROVIDER: z.enum(['waha', 'cloud', 'fake']).optional(),
  WAHA_BASE_URL: z.string().url().default('https://waha.ioshuavps.com.br'),
  WAHA_API_KEY: z.string().min(1).optional(),
  WAHA_HMAC_KEY: z.string().min(1).optional(),
  WAHA_WEBHOOK_URL: z.string().url().optional(),
  WAHA_ENGINE: z.enum(['WEBJS', 'GOWS', 'NOWEB']).default('WEBJS'),
  WAHA_SESSION_NAME: z.string().min(1).optional(),
  MAIL_DSN: z.string().min(1),
  MAIL_FROM: z.string().min(1).default('noreply@localhost'),
  RESEND_API_KEY: z.string().optional(),
  APP_PUBLIC_URL: z.string().url(),
  CORS_ORIGINS: z.string().min(1),
  SENTRY_DSN: z.string().optional(),
  /** Quantos proxies reversos ficam na frente da API (Easypanel/Traefik = 1). Sem isso o IP do cliente vira o do proxy. */
  TRUST_PROXY: z.coerce.number().int().min(0).max(5).optional(),
  KEK_LOCAL_BASE64: z.string().optional(),
  DSR_DUE_DAYS: z.coerce.number().int().min(1).max(90).default(15),
  CLINICAL_READ_ANOMALY_N: z.coerce.number().int().min(1).max(10_000).default(40),
  PLATFORM_OPERATOR_EMAILS: z.string().optional(),
  BILLING_PROVIDER: z.enum(['asaas', 'manual']).default('manual'),
  ASAAS_ENV: z.enum(['sandbox', 'production']).default('sandbox'),
  ASAAS_BASE_URL: z.string().url().optional(),
  ASAAS_CHECKOUT_BASE_URL: z.string().url().optional(),
  ASAAS_API_KEY: z.string().min(1).optional(),
  ASAAS_WEBHOOK_TOKEN: z
    .string()
    .min(32)
    .max(255)
    .regex(/^\S+$/, 'sem espaços em branco')
    .optional(),
  ASAAS_USER_AGENT: z.string().min(1).default('odonto-saas/1.0'),
});

const ASAAS_KEY_PREFIX = { sandbox: '$aact_hmlg_', production: '$aact_prod_' } as const;

export type Env = z.infer<typeof envSchema>;

/** ADR-0017: com BILLING_PROVIDER=asaas a chave e o token do webhook são obrigatórios e coerentes com o ambiente. */
function assertAsaasConfig(parsed: Env): void {
  if (parsed.BILLING_PROVIDER !== 'asaas') return;
  const problems: string[] = [];
  if (!parsed.ASAAS_API_KEY) problems.push('ASAAS_API_KEY ausente');
  if (!parsed.ASAAS_WEBHOOK_TOKEN) problems.push('ASAAS_WEBHOOK_TOKEN ausente');
  if (parsed.ASAAS_API_KEY && parsed.ASAAS_API_KEY === parsed.ASAAS_WEBHOOK_TOKEN) {
    problems.push('ASAAS_WEBHOOK_TOKEN não pode ser a API key');
  }
  if (parsed.ASAAS_API_KEY && !parsed.ASAAS_API_KEY.startsWith(ASAAS_KEY_PREFIX[parsed.ASAAS_ENV])) {
    problems.push(`ASAAS_API_KEY não pertence ao ambiente ${parsed.ASAAS_ENV}`);
  }
  if (parsed.ASAAS_BASE_URL && parsed.NODE_ENV === 'production') {
    problems.push('ASAAS_BASE_URL só é permitido fora de production');
  }
  if (problems.length > 0) {
    throw new Error(`Configuração Asaas inválida: ${problems.join('; ')}`);
  }
}

export const env: Env = envSchema.parse(process.env);
assertAsaasConfig(env);

export const jwtPrivateKey = decodePemKey(env.JWT_PRIVATE_KEY);
export const jwtPublicKey = decodePemKey(env.JWT_PUBLIC_KEY);

export function messagingMode(): 'waha' | 'cloud' | 'fake' {
  if (process.env.NODE_ENV === 'test') return 'fake';
  if (env.MESSAGING_PROVIDER) return env.MESSAGING_PROVIDER;
  return env.NODE_ENV === 'production' ? 'waha' : 'fake';
}

export function wahaHmacKey(): string {
  return env.WAHA_HMAC_KEY ?? env.WHATSAPP_APP_SECRET;
}

export function wahaWebhookUrl(): string {
  if (env.WAHA_WEBHOOK_URL) return env.WAHA_WEBHOOK_URL;
  return 'http://localhost:3333/api/v1/webhooks/whatsapp';
}

export type AsaasConfig = {
  baseUrl: string;
  checkoutBaseUrl: string;
  apiKey: string;
  webhookToken: string;
  userAgent: string;
};

/** Config do Asaas (só válida com BILLING_PROVIDER=asaas; o boot já validou os campos). */
export function asaasConfig(): AsaasConfig {
  const sandbox = env.ASAAS_ENV === 'sandbox';
  return {
    baseUrl: env.ASAAS_BASE_URL ?? (sandbox ? 'https://api-sandbox.asaas.com/v3' : 'https://api.asaas.com/v3'),
    checkoutBaseUrl:
      env.ASAAS_CHECKOUT_BASE_URL ??
      (sandbox ? 'https://sandbox.asaas.com' : 'https://asaas.com'),
    apiKey: env.ASAAS_API_KEY ?? '',
    webhookToken: env.ASAAS_WEBHOOK_TOKEN ?? '',
    userAgent: env.ASAAS_USER_AGENT,
  };
}

export function platformOperatorEmails(): string[] {
  return (env.PLATFORM_OPERATOR_EMAILS ?? '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.length > 0);
}
