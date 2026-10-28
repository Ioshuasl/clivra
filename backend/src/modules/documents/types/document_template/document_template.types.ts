import type { DocumentKind } from '../../enum/document/document_kind.enum.js';
import type { SignaturePolicy } from '../../enum/document/signature_policy.enum.js';
import type { TiptapDoc } from '../document/tiptap.types.js';

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

export type DocumentTemplatePreview = {
  title: string;
  content: TiptapDoc;
};
