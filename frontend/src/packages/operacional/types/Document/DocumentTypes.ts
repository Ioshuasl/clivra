import type { DocumentKind } from '@/packages/operacional/enum/Document/DocumentKindEnum';
import type { DocumentStatus } from '@/packages/operacional/enum/Document/DocumentStatusEnum';
import type { SignaturePolicy } from '@/packages/operacional/enum/Document/SignaturePolicyEnum';

export type TiptapMark = { type: string; attrs?: Record<string, unknown> };

export type TiptapNode = {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: TiptapMark[];
  content?: TiptapNode[];
};

export type TiptapDoc = { type: 'doc'; content: TiptapNode[] };

export type DocumentTemplateSummary = {
  id: string;
  kind: DocumentKind;
  name: string;
  content: TiptapDoc;
  professionalSignature: SignaturePolicy;
  patientSignature: SignaturePolicy;
  active: boolean;
  systemKey: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DocumentTemplatePreview = { title: string; content: TiptapDoc };

export type DocumentSignatureSummary = {
  id: string;
  signerType: 'PROFESSIONAL' | 'PATIENT' | 'GUARDIAN';
  method: 'ICP_A1' | 'PATIENT_ACCEPT' | 'PATIENT_WHATSAPP_CODE';
  signerName: string;
  certificateSubject: string | null;
  signedAt: string;
};

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
  quoteId: string | null;
  hasPdf: boolean;
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

export type DocumentPdfResult = { url: string; expiresIn: number };

export type DocumentTemplateSaveInput = {
  kind: DocumentKind;
  name: string;
  content: TiptapDoc;
  professionalSignature: SignaturePolicy;
  patientSignature: SignaturePolicy;
};

export type DocumentTemplateUpdateInput = {
  templateId: string;
  template: Partial<DocumentTemplateSaveInput> & { active?: boolean };
};

export type DocumentTemplatePreviewInput = {
  templateId: string;
  patientId: string;
  professionalId?: string;
};

export type DocumentIssueInput = {
  patientId: string;
  templateId: string;
  professionalId?: string;
  title?: string;
  content?: TiptapDoc;
  supersedesId?: string;
  amendReason?: string;
};

export type DocumentCancelInput = { documentId: string; reason: string };
