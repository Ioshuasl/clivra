import type { DocumentStatus } from '../../enum/document/document_status.enum.js';
import type { SignaturePolicy } from '../../enum/document/signature_policy.enum.js';

/** Depois que o dentista assina, só falta o paciente se o modelo exigir a assinatura dele. */
export function statusAfterProfessionalSignature(
  patientPolicy: SignaturePolicy,
  patientSigned: boolean,
): DocumentStatus {
  return patientPolicy === 'REQUIRED' && !patientSigned ? 'AWAITING_SIGNATURE' : 'SIGNED';
}

/** Depois que o paciente assina, só falta o dentista se o modelo exigir a assinatura dele. */
export function statusAfterPatientSignature(
  professionalPolicy: SignaturePolicy,
  professionalSigned: boolean,
): DocumentStatus {
  return professionalPolicy === 'REQUIRED' && !professionalSigned ? 'AWAITING_SIGNATURE' : 'SIGNED';
}
