import { z } from 'zod';
import { BILLING_METHODS } from '@/packages/admin/enum/Subscription/BillingMethodEnum';
import { digitsOnly } from '@/packages/admin/helpers/BrazilDocumentMasks';

export const subscriptionCheckoutSchema = z
  .object({
    planCode: z.string().min(1, 'Escolha um plano.'),
    billingMethod: z.enum(BILLING_METHODS),
    cpfCnpj: z.string(),
  })
  .superRefine((values, ctx) => {
    // No cartão, o titular informa os dados na página segura do Asaas; Pix/boleto precisam do documento.
    if (values.billingMethod === 'CREDIT_CARD') return;
    const digits = digitsOnly(values.cpfCnpj);
    if (digits.length !== 11 && digits.length !== 14) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['cpfCnpj'],
        message: 'Informe um CPF (11 dígitos) ou CNPJ (14 dígitos).',
      });
    }
  });

export type SubscriptionCheckoutFormValues = z.infer<typeof subscriptionCheckoutSchema>;
