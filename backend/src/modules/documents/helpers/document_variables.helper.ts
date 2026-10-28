import type { DocumentVariables } from '../models/document/document_render.model.js';
import type { QuoteContractData } from '../types/quote_contract/quote_contract.types.js';

export type DocumentVariablesSource = {
  patientName: string;
  patientCpf: string | null;
  patientBirthDate: string | null;
  clinicName: string;
  clinicTaxId: string | null;
  professionalName: string;
  professionalCro: string | null;
  professionalCroState: string | null;
  timezone: string;
  now: Date;
  /** Só existe quando o documento nasce de um orçamento. */
  quote?: QuoteContractData;
};

function formatCpf(value: string | null): string | null {
  if (!value || value.length !== 11) return value;
  return `${value.slice(0, 3)}.${value.slice(3, 6)}.${value.slice(6, 9)}-${value.slice(9)}`;
}

function formatCnpj(value: string | null): string | null {
  const digits = value?.replace(/\D/g, '') ?? '';
  if (digits.length !== 14) return value;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

function formatBirthDate(value: string | null): string | null {
  if (!value) return null;
  const [year, month, day] = value.slice(0, 10).split('-');
  return year && month && day ? `${day}/${month}/${year}` : null;
}

function brl(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function ymdToBr(value: string): string {
  const [year, month, day] = value.slice(0, 10).split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
}

/** "3x de R$ 100,00 (1º vencimento em 10/11/2026)" ou, se as parcelas diferem, uma a uma. */
function describeInstallments(installments: QuoteContractData['installments']): string | null {
  if (installments.length === 0) return null;
  const first = installments[0];
  if (!first) return null;
  const equal = installments.every((line) => line.amountCents === first.amountCents);
  if (equal) {
    return `${installments.length}x de ${brl(first.amountCents)} (1º vencimento em ${ymdToBr(first.dueDate)})`;
  }
  return installments
    .map((line) => `${line.number}ª de ${brl(line.amountCents)} em ${ymdToBr(line.dueDate)}`)
    .join('; ');
}

function describeItems(items: QuoteContractData['items']): string | null {
  if (items.length === 0) return null;
  return items
    .map((item) => {
      const place = [item.toothCode, item.face].filter(Boolean).join('/');
      const label = place ? `${item.procedureName} (${place})` : item.procedureName;
      return `${label} × ${item.quantity} — ${brl(item.totalCents)}`;
    })
    .join('; ');
}

function quoteVariables(quote: QuoteContractData | undefined): DocumentVariables {
  if (!quote) return {};
  return {
    'orcamento.numero': quote.quoteNumber,
    'orcamento.total': brl(quote.totalCents),
    'orcamento.entrada': quote.downPaymentCents > 0 ? brl(quote.downPaymentCents) : null,
    'orcamento.parcelas': describeInstallments(quote.installments),
    'orcamento.itens': describeItems(quote.items),
  };
}

export function buildDocumentVariables(source: DocumentVariablesSource): DocumentVariables {
  const today = new Intl.DateTimeFormat('pt-BR', { timeZone: source.timezone }).format(source.now);
  const extenso = new Intl.DateTimeFormat('pt-BR', {
    timeZone: source.timezone,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(source.now);
  const cro = source.professionalCro
    ? [source.professionalCro, source.professionalCroState].filter(Boolean).join('/')
    : null;

  return {
    'paciente.nome': source.patientName,
    'paciente.cpf': formatCpf(source.patientCpf),
    'paciente.data_nascimento': formatBirthDate(source.patientBirthDate),
    'clinica.nome': source.clinicName,
    'clinica.cnpj': formatCnpj(source.clinicTaxId),
    'profissional.nome': source.professionalName,
    'profissional.cro': cro,
    'data.hoje': today,
    'data.hoje_extenso': extenso,
    ...quoteVariables(source.quote),
  };
}
