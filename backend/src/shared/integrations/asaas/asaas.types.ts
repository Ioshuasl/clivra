import { z } from 'zod';

/**
 * Payloads do Asaas. `.passthrough()` em tudo: o Asaas pode adicionar atributos sem aviso
 * e isso nunca pode derrubar a integração (docs.asaas.com — eventos de webhook).
 */
export const asaasCustomerSchema = z
  .object({ id: z.string().min(1), externalReference: z.string().nullish() })
  .passthrough();

export const asaasSubscriptionSchema = z
  .object({
    id: z.string().min(1),
    customer: z.string().nullish(),
    status: z.string().nullish(),
    value: z.number().nullish(),
    nextDueDate: z.string().nullish(),
    cycle: z.string().nullish(),
    billingType: z.string().nullish(),
    externalReference: z.string().nullish(),
    deleted: z.boolean().nullish(),
  })
  .passthrough();

export const asaasPaymentSchema = z
  .object({
    id: z.string().min(1),
    customer: z.string().nullish(),
    subscription: z.string().nullish(),
    status: z.string().min(1),
    value: z.number(),
    dueDate: z.string().min(1),
    billingType: z.string().nullish(),
    invoiceUrl: z.string().nullish(),
    bankSlipUrl: z.string().nullish(),
    paymentDate: z.string().nullish(),
    confirmedDate: z.string().nullish(),
    clientPaymentDate: z.string().nullish(),
    externalReference: z.string().nullish(),
    deleted: z.boolean().nullish(),
  })
  .passthrough();

export const asaasPixQrCodeSchema = z
  .object({
    encodedImage: z.string(),
    payload: z.string(),
    expirationDate: z.string().nullish(),
  })
  .passthrough();

export const asaasIdentificationFieldSchema = z
  .object({ identificationField: z.string().nullish() })
  .passthrough();

export const asaasCheckoutSchema = z
  .object({ id: z.string().min(1), link: z.string().nullish() })
  .passthrough();

export function asaasListSchema<T extends z.ZodTypeAny>(item: T) {
  return z
    .object({
      data: z.array(item),
      hasMore: z.boolean().default(false),
      totalCount: z.number().optional(),
      offset: z.number().optional(),
      limit: z.number().optional(),
    })
    .passthrough();
}

/** Corpo de webhook: id do evento (idempotência) + tipo + objeto relacionado. */
export const asaasWebhookBodySchema = z
  .object({
    id: z.string().min(1).max(255),
    event: z.string().min(1).max(100),
    dateCreated: z.string().nullish(),
    payment: asaasPaymentSchema.partial().passthrough().nullish(),
    subscription: asaasSubscriptionSchema.partial().passthrough().nullish(),
    checkout: z.record(z.unknown()).nullish(),
  })
  .passthrough();

export type AsaasCustomer = z.infer<typeof asaasCustomerSchema>;
export type AsaasSubscription = z.infer<typeof asaasSubscriptionSchema>;
export type AsaasPayment = z.infer<typeof asaasPaymentSchema>;
export type AsaasWebhookBody = z.infer<typeof asaasWebhookBodySchema>;
