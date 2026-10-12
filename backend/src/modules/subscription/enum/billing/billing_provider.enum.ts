export const BillingProvider = {
  ASAAS: 'ASAAS',
  MANUAL: 'MANUAL',
} as const;

export type BillingProvider = (typeof BillingProvider)[keyof typeof BillingProvider];
