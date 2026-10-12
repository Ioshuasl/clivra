import { z } from 'zod';
import { BILLING_METHODS } from '../enum/billing/billing_method.enum.js';
import { PlanCode } from '../enum/plan/plan_code.enum.js';
import { OPS_SUBSCRIPTION_STATUSES } from '../enum/subscription/subscription_status.enum.js';

export const opsStatusBodySchema = z.object({
  status: z.enum(OPS_SUBSCRIPTION_STATUSES),
  reason: z.string().trim().min(1).max(500).optional(),
});

export type OpsStatusBodySchema = z.infer<typeof opsStatusBodySchema>;

/** CPF (11) ou CNPJ (14), com ou sem máscara; só dígitos daqui para frente. */
const cpfCnpjSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/\D/g, ''))
  .refine((digits) => digits.length === 11 || digits.length === 14, 'CPF ou CNPJ inválido');

export const checkoutBodySchema = z.object({
  planCode: z.enum([PlanCode.ESSENCIAL, PlanCode.CLINICA, PlanCode.REDE]),
  billingMethod: z.enum(BILLING_METHODS),
  cpfCnpj: cpfCnpjSchema.optional(),
});

export type CheckoutBodySchema = z.infer<typeof checkoutBodySchema>;

export const cancelBodySchema = z.object({
  reason: z.string().trim().min(1).max(500).optional(),
});

export type CancelBodySchema = z.infer<typeof cancelBodySchema>;

export const paymentListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().uuid().optional(),
});

export type PaymentListQuerySchema = z.infer<typeof paymentListQuerySchema>;

export const paymentIdParamsSchema = z.object({ id: z.string().uuid() });

export type PaymentIdParamsSchema = z.infer<typeof paymentIdParamsSchema>;
