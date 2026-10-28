import type { QuoteContractData } from '../../documents/documents_public.js';
import type { QuoteDto } from '../types/quote/quote_crud.types.js';

/** Dados do orçamento aprovado que o contrato usa; null se ainda não há aprovação com cobrança. */
export function buildQuoteContractData(quote: QuoteDto): QuoteContractData | null {
  if (!quote.receivable) return null;
  if (quote.status !== 'APPROVED' && quote.status !== 'PARTIALLY_APPROVED') return null;
  return {
    quoteId: quote.id,
    quoteNumber: quote.number,
    patientId: quote.patientId,
    professionalId: quote.professionalId,
    totalCents: quote.receivable.totalCents,
    downPaymentCents: quote.receivable.downPaymentCents,
    items: quote.items
      .filter((item) => item.approved)
      .map((item) => ({
        procedureName: item.procedureName,
        toothCode: item.toothCode,
        face: item.face,
        quantity: item.quantity,
        totalCents: item.totalCents,
      })),
    installments: quote.receivable.installments,
  };
}
