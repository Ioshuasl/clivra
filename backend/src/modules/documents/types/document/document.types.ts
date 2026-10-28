import type { DocumentKind } from '../../enum/document/document_kind.enum.js';
import type { DocumentStatus } from '../../enum/document/document_status.enum.js';
import type { SignaturePolicy } from '../../enum/document/signature_policy.enum.js';
import type { DocumentSignatureSummary } from '../signature/signature.types.js';
import type { TiptapDoc } from './tiptap.types.js';

export type DocumentSummary = {
  id: string;
  patientId: string;
  professionalId: string;
  templateId: string | null;
  kind: DocumentKind;
  title: string;
  status: DocumentStatus;
  professionalSignature: SignaturePolicy;
  patientSignature: SignaturePolicy;
  version: number;
  supersedesId: string | null;
  hasPdf: boolean;
  quoteId: string | null;
  signatures: DocumentSignatureSummary[];
  issuedAt: string;
  cancelledAt: string | null;
};

export type DocumentDetail = DocumentSummary & {
  content: TiptapDoc;
  contentHash: string;
  amendReason: string | null;
  cancelReason: string | null;
};

/** Leitura interna: inclui a chave do PDF no storage (nunca vai para a API). */
export type DocumentRecord = DocumentDetail & { pdfKey: string | null };

export type DocumentPdfResult = {
  url: string;
  expiresIn: number;
};

/** Dados do documento a gravar (já renderizado, com hash). */
export type DocumentIssueRow = {
  id: string;
  patientId: string;
  professionalId: string;
  templateId: string | null;
  kind: DocumentKind;
  title: string;
  content: TiptapDoc;
  contentHash: string;
  status: DocumentStatus;
  professionalSignature: SignaturePolicy;
  patientSignature: SignaturePolicy;
  version: number;
  supersedesId: string | null;
  amendReason: string | null;
  quoteId: string | null;
  issuedBy: string;
};
