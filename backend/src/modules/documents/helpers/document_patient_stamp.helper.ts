import type { DocumentPdfPatientStamp } from './document_pdf.helper.js';
import type { DocumentSignatureSummary } from '../types/signature/signature.types.js';

export function formatSignedAt(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: timezone,
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

/** Texto do carimbo conforme o que de fato foi usado (aceite ou código recebido por WhatsApp/e-mail). */
export function patientMethodLabel(
  method: 'PATIENT_ACCEPT' | 'PATIENT_WHATSAPP_CODE',
  codeSentVia: 'WHATSAPP' | 'EMAIL' | null,
): string {
  if (method === 'PATIENT_ACCEPT') return 'Aceite eletrônico do paciente';
  return codeSentVia === 'EMAIL'
    ? 'Confirmado com código enviado por e-mail'
    : 'Confirmado com código enviado por WhatsApp';
}

/** Carimbo do paciente a partir das assinaturas já gravadas (usado quando o dentista assina depois). */
export function patientStampFromSignatures(
  signatures: DocumentSignatureSummary[],
  timezone: string,
): DocumentPdfPatientStamp | undefined {
  const patient = signatures.find((signature) => signature.signerType !== 'PROFESSIONAL');
  if (!patient) return undefined;
  return {
    signedAtLabel: formatSignedAt(new Date(patient.signedAt), timezone),
    methodLabel:
      patient.method === 'PATIENT_WHATSAPP_CODE'
        ? 'Confirmado com código de verificação'
        : 'Aceite eletrônico do paciente',
  };
}
