import type { DocumentKind } from '../../../enum/document/document_kind.enum.js';
import type { SignaturePolicy } from '../../../enum/document/signature_policy.enum.js';
import type { TiptapDoc } from '../../../types/document/tiptap.types.js';
import type { DocumentTemplateSummary } from '../../../types/document_template/document_template.types.js';

export function mapDocumentTemplate(row: {
  id: string;
  kind: string;
  name: string;
  content: unknown;
  professionalSignature: string;
  patientSignature: string;
  active: boolean;
  systemKey: string | null;
  createdAt: Date;
  updatedAt: Date;
}): DocumentTemplateSummary {
  return {
    id: row.id,
    kind: row.kind as DocumentKind,
    name: row.name,
    content: row.content as TiptapDoc,
    professionalSignature: row.professionalSignature as SignaturePolicy,
    patientSignature: row.patientSignature as SignaturePolicy,
    active: row.active,
    systemKey: row.systemKey,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
