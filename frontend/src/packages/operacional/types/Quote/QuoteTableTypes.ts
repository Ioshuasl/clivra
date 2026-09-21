import type { QuoteSummary } from '@/packages/operacional/types/Quote/QuoteTypes';

export type QuoteTableProps = {
  quotes: QuoteSummary[];
  patientNames: Record<string, string>;
  loading?: boolean;
  onRowClick: (quote: QuoteSummary) => void;
  onEdit: (quote: QuoteSummary) => void;
  onSend: (quote: QuoteSummary) => void;
  onDecide: (quote: QuoteSummary) => void;
  onDuplicate: (quote: QuoteSummary) => void;
  onPdf: (quote: QuoteSummary) => void;
  duplicatingId?: string | null;
  pdfLoadingId?: string | null;
};
