import type { PatientSignatureMethod } from '../../enum/signature/patient_signature_method.enum.js';
import type { TiptapDoc } from '../document/tiptap.types.js';

export type SignatureDeliveryChannel = 'WHATSAPP' | 'EMAIL' | 'COPY';

/** Resultado do pedido feito pela recepção/dentista. */
export type SignatureRequestCreateResult = {
  method: PatientSignatureMethod;
  sentVia: SignatureDeliveryChannel;
  expiresAt: string;
  /** Só vem quando o link precisa ser copiado e enviado à mão. */
  publicUrl?: string;
};

/** O que o link público consegue resolver (sem conhecer a clínica). */
export type SignatureRequestLookup = {
  id: string;
  tenantId: string;
  documentId: string;
  method: PatientSignatureMethod;
  expiresAt: Date;
  usedAt: Date | null;
  revokedAt: Date | null;
};

/** Estado completo do pedido, com o código de confirmação (só hash). */
export type SignatureRequestState = SignatureRequestLookup & {
  codeHash: string | null;
  codeExpiresAt: Date | null;
  codeAttempts: number;
  codeSentVia: 'WHATSAPP' | 'EMAIL' | null;
};

export type PublicSignatureView = {
  clinicName: string;
  patientFirstName: string;
  method: PatientSignatureMethod;
  document: { title: string; content: TiptapDoc };
  expiresAt: string;
};

export type PublicSendCodeResult = {
  sentVia: 'WHATSAPP' | 'EMAIL';
  /** Destino parcialmente escondido, para o paciente reconhecer (ex.: "final 4321"). */
  destinationHint: string;
  expiresAt: string;
};

export type PublicSignResult = { signedAt: string };
