import { z } from 'zod';
import { INSTALLMENT_STATUSES } from '../enum/installment/installment_status.enum.js';
import { PAYMENT_METHODS } from '../enum/payment/payment_method.enum.js';
import { RECEIVABLE_STATUSES } from '../enum/receivable/receivable_status.enum.js';
import { FINANCIAL_CATEGORY_KINDS } from '../enum/financial_category/financial_category_kind.enum.js';
import { PAYABLE_STATUSES } from '../enum/payable/payable_status.enum.js';
import { RECEIPT_SEND_CHANNELS } from '../enum/receipt/send_channel.enum.js';
import { CASH_FLOW_BASES } from '../enum/report/cash_flow_basis.enum.js';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const receivableListQuerySchema = z.object({
  patientId: z.string().uuid().optional(),
  status: z.enum(RECEIVABLE_STATUSES).optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export type ReceivableListQuerySchema = z.infer<typeof receivableListQuerySchema>;

export const receivableCreateSchema = z
  .object({
    patientId: z.string().uuid(),
    unitId: z.string().uuid().optional(),
    totalCents: z.number().int().positive(),
    installmentCount: z.number().int().min(1).max(36),
    firstDueDate: isoDate,
    downPaymentCents: z.number().int().min(0).optional(),
    description: z.string().max(500).optional().nullable(),
    categoryId: z.string().uuid().optional(),
  })
  .strict();

export type ReceivableCreateSchema = z.infer<typeof receivableCreateSchema>;

export const receivableCancelSchema = z
  .object({
    reason: z.string().trim().min(10).max(2000),
  })
  .strict();

export type ReceivableCancelSchema = z.infer<typeof receivableCancelSchema>;

export const receivableIdParamSchema = z.object({ id: z.string().uuid() });

export const installmentListQuerySchema = z.object({
  patientId: z.string().uuid().optional(),
  status: z.enum(INSTALLMENT_STATUSES).optional(),
  dueFrom: isoDate.optional(),
  dueTo: isoDate.optional(),
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export type InstallmentListQuerySchema = z.infer<typeof installmentListQuerySchema>;

export const installmentIdParamSchema = z.object({ id: z.string().uuid() });

export const paymentSplitSchema = z
  .object({
    method: z.enum(PAYMENT_METHODS),
    amountCents: z.number().int().positive(),
    cardBrand: z.string().min(1).max(40).optional().nullable(),
    installmentsQty: z.number().int().min(1).max(24).optional().nullable(),
  })
  .strict();

export const paymentCreateSchema = z
  .object({
    amountCents: z.number().int().positive(),
    receivedAt: z.string().datetime({ offset: true }).optional().nullable(),
    notes: z.string().max(2000).optional().nullable(),
    splits: z.array(paymentSplitSchema).min(1).max(20),
  })
  .strict();

export type PaymentCreateSchema = z.infer<typeof paymentCreateSchema>;

export const paymentReverseSchema = z
  .object({
    reason: z.string().trim().min(10).max(2000),
  })
  .strict();

export type PaymentReverseSchema = z.infer<typeof paymentReverseSchema>;

export const paymentIdParamSchema = z.object({ id: z.string().uuid() });

export const patientIdParamSchema = z.object({ id: z.string().uuid() });

export const cashMethodAmountSchema = z
  .object({
    method: z.enum(PAYMENT_METHODS),
    amountCents: z.number().int().min(0),
  })
  .strict();

export const cashSessionCreateSchema = z
  .object({
    unitId: z.string().uuid(),
    openingCents: z.number().int().min(0),
    openingByMethod: z.array(cashMethodAmountSchema).max(20).optional(),
  })
  .strict();

export type CashSessionCreateSchema = z.infer<typeof cashSessionCreateSchema>;

export const cashSessionCurrentQuerySchema = z.object({
  unitId: z.string().uuid(),
});

export type CashSessionCurrentQuerySchema = z.infer<typeof cashSessionCurrentQuerySchema>;

export const cashSessionIdParamSchema = z.object({ id: z.string().uuid() });

export const cashCountedSchema = z
  .object({
    method: z.enum(PAYMENT_METHODS),
    countedCents: z.number().int().min(0),
  })
  .strict();

export const cashSessionCloseSchema = z
  .object({
    countedByMethod: z.array(cashCountedSchema).min(1).max(20),
    differenceReason: z.string().trim().min(10).max(2000).optional().nullable(),
  })
  .strict();

export type CashSessionCloseSchema = z.infer<typeof cashSessionCloseSchema>;

export const cashMovementCreateSchema = z
  .object({
    kind: z.enum(['SUPPLY', 'WITHDRAWAL']),
    amountCents: z.number().int().positive(),
    method: z.enum(PAYMENT_METHODS),
    reason: z.string().trim().min(10).max(2000),
  })
  .strict();

export type CashMovementCreateSchema = z.infer<typeof cashMovementCreateSchema>;

export const financialCategoryListQuerySchema = z.object({
  kind: z.enum(FINANCIAL_CATEGORY_KINDS).optional(),
  active: z.enum(['true', 'false']).optional(),
});

export type FinancialCategoryListQuerySchema = z.infer<typeof financialCategoryListQuerySchema>;

export const financialCategoryCreateSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    kind: z.enum(FINANCIAL_CATEGORY_KINDS),
    parentId: z.string().uuid().optional().nullable(),
  })
  .strict();

export type FinancialCategoryCreateSchema = z.infer<typeof financialCategoryCreateSchema>;

const payableRecurrenceSchema = z
  .object({
    frequency: z.literal('MONTHLY'),
    until: isoDate.optional().nullable(),
  })
  .strict();

export const payableListQuerySchema = z.object({
  status: z.enum(PAYABLE_STATUSES).optional(),
  dueFrom: isoDate.optional(),
  dueTo: isoDate.optional(),
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export type PayableListQuerySchema = z.infer<typeof payableListQuerySchema>;

export const payableCreateSchema = z
  .object({
    unitId: z.string().uuid(),
    categoryId: z.string().uuid(),
    description: z.string().trim().min(3).max(500),
    amountCents: z.number().int().positive(),
    dueDate: isoDate,
    supplier: z.string().trim().max(200).optional().nullable(),
    recurrence: payableRecurrenceSchema.optional().nullable(),
  })
  .strict();

export type PayableCreateSchema = z.infer<typeof payableCreateSchema>;

export const payableUpdateSchema = z
  .object({
    categoryId: z.string().uuid().optional(),
    description: z.string().trim().min(3).max(500).optional(),
    amountCents: z.number().int().positive().optional(),
    dueDate: isoDate.optional(),
    supplier: z.string().trim().max(200).optional().nullable(),
    recurrence: payableRecurrenceSchema.optional().nullable(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, { message: 'Informe ao menos um campo.' });

export type PayableUpdateSchema = z.infer<typeof payableUpdateSchema>;

export const payablePaySchema = z
  .object({
    method: z.enum(PAYMENT_METHODS),
    paidAt: z.string().datetime({ offset: true }).optional().nullable(),
  })
  .strict();

export type PayablePaySchema = z.infer<typeof payablePaySchema>;

export const payableIdParamSchema = z.object({ id: z.string().uuid() });

export const receiptSendSchema = z
  .object({
    channel: z.enum(RECEIPT_SEND_CHANNELS),
  })
  .strict();

export type ReceiptSendSchema = z.infer<typeof receiptSendSchema>;

export const installmentChargeSchema = z
  .object({
    channel: z.enum(RECEIPT_SEND_CHANNELS),
  })
  .strict();

export type InstallmentChargeSchema = z.infer<typeof installmentChargeSchema>;

export const cashFlowQuerySchema = z.object({
  from: isoDate,
  to: isoDate,
  basis: z.enum(CASH_FLOW_BASES),
  unitId: z.string().uuid().optional(),
});

export type CashFlowQuerySchema = z.infer<typeof cashFlowQuerySchema>;

export const overdueReportQuerySchema = z.object({
  unitId: z.string().uuid().optional(),
  professionalId: z.string().uuid().optional(),
});

export type OverdueReportQuerySchema = z.infer<typeof overdueReportQuerySchema>;

export const productionReportQuerySchema = z.object({
  from: isoDate,
  to: isoDate,
  professionalId: z.string().uuid().optional(),
});

export type ProductionReportQuerySchema = z.infer<typeof productionReportQuerySchema>;
