import type { DocumentKind } from '../../../enum/document/document_kind.enum.js';
import type { DocumentStatus } from '../../../enum/document/document_status.enum.js';
import type { SignaturePolicy } from '../../../enum/document/signature_policy.enum.js';
import type { DocumentRecord, DocumentSummary } from '../../../types/document/document.types.js';
import type { TiptapDoc } from '../../../types/document/tiptap.types.js';
import type { SignatureMethod } from '../../../enum/signature/signature_method.enum.js';
import type { SignerType } from '../../../enum/signature/signer_type.enum.js';

type DocumentRow = {
  id: string;
  patientId: string;
  professionalId: string;
  templateId: string | null;
  kind: string;
  title: string;
  status: string;
  professionalSignature: string;
  patientSignature: string;
  version: number;
  supersedesId: string | null;
  pdfKey: string | null;
  quoteId: string | null;
  issuedAt: Date;
  cancelledAt: Date | null;
  signatures: Array<{
    id: string;
    signerType: string;
    method: string;
    signerName: string;
    certificateSubject: string | null;
    signedAt: Date;
  }>;
};

export function mapDocumentSummary(row: DocumentRow): DocumentSummary {
  return {
    id: row.id,
    patientId: row.patientId,
    professionalId: row.professionalId,
    templateId: row.templateId,
    kind: row.kind as DocumentKind,
    title: row.title,
    status: row.status as DocumentStatus,
    professionalSignature: row.professionalSignature as SignaturePolicy,
    patientSignature: row.patientSignature as SignaturePolicy,
    version: row.version,
    supersedesId: row.supersedesId,
    hasPdf: row.pdfKey !== null,
    quoteId: row.quoteId,
    signatures: row.signatures.map((signature) => ({
      id: signature.id,
      signerType: signature.signerType as SignerType,
      method: signature.method as SignatureMethod,
      signerName: signature.signerName,
      certificateSubject: signature.certificateSubject,
      signedAt: signature.signedAt.toISOString(),
    })),
    issuedAt: row.issuedAt.toISOString(),
    cancelledAt: row.cancelledAt ? row.cancelledAt.toISOString() : null,
  };
}

export function mapDocumentRecord(
  row: DocumentRow & {
    content: unknown;
    contentHash: string;
    amendReason: string | null;
    cancelReason: string | null;
  },
): DocumentRecord {
  return {
    ...mapDocumentSummary(row),
    content: row.content as TiptapDoc,
    contentHash: row.contentHash,
    amendReason: row.amendReason,
    cancelReason: row.cancelReason,
    pdfKey: row.pdfKey,
  };
}
