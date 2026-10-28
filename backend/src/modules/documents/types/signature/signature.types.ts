import type { SignatureMethod } from '../../enum/signature/signature_method.enum.js';
import type { SignerType } from '../../enum/signature/signer_type.enum.js';

export type DocumentSignatureSummary = {
  id: string;
  signerType: SignerType;
  method: SignatureMethod;
  signerName: string;
  certificateSubject: string | null;
  signedAt: string;
};

/** Dados gravados ao assinar o documento (dentista com A1 ou paciente por link). */
export type DocumentSignatureRow = {
  id: string;
  documentId: string;
  signerType: SignerType;
  method: SignatureMethod;
  professionalId: string | null;
  signerName: string;
  certificateSubject: string | null;
  certificateSerial: string | null;
  certificateNotAfter: Date | null;
  signedPdfKey: string | null;
  signedPdfSha256: string | null;
  /** Prova do aceite do paciente (IP, aparelho, hash do texto, canal do código). */
  evidence: Record<string, unknown> | null;
  signedAt: Date;
};
