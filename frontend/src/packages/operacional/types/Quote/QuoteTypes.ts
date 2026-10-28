import type { QuoteSendChannel } from '@/packages/operacional/enum/Quote/QuoteSendChannelEnum';
import type { QuoteStatus } from '@/packages/operacional/enum/Quote/QuoteStatusEnum';

export type QuoteProcedureOption = {
  id: string;
  code: string;
  name: string;
  defaultMinutes: number;
  priceCents: number;
  requiresTooth: boolean;
  requiresFace: boolean;
  active: boolean;
};

export type QuoteItem = {
  id: string;
  procedureId: string;
  procedureName: string;
  procedureCode: string;
  toothCode: string | null;
  face: string | null;
  quantity: number;
  unitPriceCents: number;
  discountCents: number;
  totalCents: number;
  sortOrder: number;
  approved: boolean;
};

export type QuoteReceivable = {
  id: string;
  totalCents: number;
  downPaymentCents: number;
  installments: Array<{ number: number; dueDate: string; amountCents: number }>;
};

export type QuoteSummary = {
  id: string;
  number: string;
  status: QuoteStatus;
  patientId: string;
  professionalId: string;
  unitId: string;
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  validUntil: string | null;
  sentAt: string | null;
  decidedAt: string | null;
  rejectReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type QuoteDetail = QuoteSummary & {
  notes: string | null;
  items: QuoteItem[];
  receivable: QuoteReceivable | null;
};

export type QuoteListQuery = {
  patientId?: string;
  status?: QuoteStatus;
  cursor?: string;
  limit?: number;
};

export type QuoteListResult = {
  items: QuoteSummary[];
  nextCursor: string | null;
};

export type QuoteCreateInput = {
  patientId: string;
  professionalId: string;
  unitId?: string;
  validUntil?: string | null;
  notes?: string | null;
  discountCents?: number;
  items: Array<{
    procedureId: string;
    toothCode?: string | null;
    face?: string | null;
    quantity?: number;
    discountCents?: number;
  }>;
};

export type QuoteUpdateInput = {
  validUntil?: string | null;
  notes?: string | null;
  discountCents?: number;
};

export type QuoteItemCreateInput = {
  procedureId: string;
  toothCode?: string | null;
  face?: string | null;
  quantity?: number;
  discountCents?: number;
};

export type QuoteSendResult = {
  quote: QuoteDetail;
  sentVia: QuoteSendChannel;
  expiresAt: string;
  publicUrl?: string;
};

export type QuoteContractResult = { documentId: string; created: boolean };

export type QuotePdfResult = {
  url: string;
  expiresIn: number;
};

export type QuoteDecisionInput = {
  decision: 'APPROVED' | 'REJECTED';
  approvedItemIds?: string[];
  reason?: string | null;
  guardianCpf?: string;
  payment?: {
    installments: number;
    firstDueDate: string;
    method?: string;
    downPaymentCents?: number;
  };
};

export type QuoteDecisionResult = {
  quoteId: string;
  status: QuoteStatus;
  treatmentPlanId: string | null;
  treatmentItems: number;
  receivable: QuoteReceivable | null;
};
