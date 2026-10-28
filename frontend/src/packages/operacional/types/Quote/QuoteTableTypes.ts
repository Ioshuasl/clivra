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
  /** Sem esta função a tabela não oferece contrato (ex.: lista geral). */
  onContract?: (quote: QuoteSummary) => void;
  /** Orçamentos que já têm contrato ativo. */
  contractQuoteIds?: ReadonlySet<string>;
  contractingId?: string | null;
  duplicatingId?: string | null;
  pdfLoadingId?: string | null;
};
