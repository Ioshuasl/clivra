import type { DocumentSummary } from '@/packages/operacional/types/Document/DocumentTypes';

export function professionalSignature(document: DocumentSummary) {
  return document.signatures.find((signature) => signature.signerType === 'PROFESSIONAL');
}

/** O dentista responsável ainda pode assinar (o documento aceita assinatura e ainda não tem a dele). */
export function canSignAsProfessional(document: DocumentSummary, myProfessionalId: string | null | undefined): boolean {
  return (
    Boolean(myProfessionalId) &&
    myProfessionalId === document.professionalId &&
    document.status !== 'CANCELLED' &&
    document.professionalSignature !== 'NONE' &&
    !professionalSignature(document)
  );
}

/** Assinaturas obrigatórias que ainda faltam, em linguagem simples. */
export function pendingSignatures(document: DocumentSummary): string[] {
  if (document.status === 'CANCELLED') return [];
  const missing: string[] = [];
  if (document.professionalSignature === 'REQUIRED' && !professionalSignature(document)) {
    missing.push('assinatura do dentista');
  }
  if (
    document.patientSignature === 'REQUIRED' &&
    !document.signatures.some((signature) => signature.signerType !== 'PROFESSIONAL')
  ) {
    missing.push('assinatura do paciente');
  }
  return missing;
}

export function patientSignature(document: DocumentSummary) {
  return document.signatures.find((signature) => signature.signerType !== 'PROFESSIONAL');
}

/** A clínica ainda pode mandar o link: o modelo pede assinatura do paciente e ela ainda não veio. */
export function canRequestPatientSignature(document: DocumentSummary): boolean {
  return (
    document.status !== 'CANCELLED' && document.patientSignature !== 'NONE' && !patientSignature(document)
  );
}
