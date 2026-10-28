/** Dados do orçamento aprovado que o contrato precisa. Quem aprova (treatments) monta e entrega. */
export type QuoteContractData = {
  quoteId: string;
  quoteNumber: string;
  patientId: string;
  professionalId: string;
  totalCents: number;
  downPaymentCents: number;
  items: Array<{
    procedureName: string;
    toothCode: string | null;
    face: string | null;
    quantity: number;
    totalCents: number;
  }>;
  installments: Array<{ number: number; dueDate: string; amountCents: number }>;
};

/** AUTO = ao aprovar (só se a clínica ligou); MANUAL = botão "Gerar contrato". */
export type QuoteContractMode = 'AUTO' | 'MANUAL';

export type QuoteContractResult = { documentId: string; created: boolean };
