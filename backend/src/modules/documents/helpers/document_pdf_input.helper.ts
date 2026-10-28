import type { DocumentPdfInput, DocumentPdfPatientStamp, DocumentPdfSignature } from './document_pdf.helper.js';
import type { SignaturePolicy } from '../enum/document/signature_policy.enum.js';
import type { DocumentVariablesBuilt } from '../types/document/document_variables.types.js';
import type { TiptapDoc } from '../types/document/tiptap.types.js';

type PdfInputArgs = {
  built: DocumentVariablesBuilt;
  title: string;
  content: TiptapDoc;
  contentHash: string;
  professionalSignature: SignaturePolicy;
  patientSignature: SignaturePolicy;
  signature?: DocumentPdfSignature;
  patientStamp?: DocumentPdfPatientStamp;
};

/** Monta o que o PDF precisa — usado na emissão e de novo ao assinar (mesmo texto, com o carimbo). */
export function buildDocumentPdfInput(args: PdfInputArgs): DocumentPdfInput {
  return {
    ...args.built.letterhead,
    title: args.title,
    content: args.content,
    professionalName: args.built.professional.name,
    professionalCro: args.built.professional.cro,
    patientName: args.built.patient.name,
    professionalLine: args.professionalSignature !== 'NONE',
    patientLine: args.patientSignature !== 'NONE',
    verificationCode: args.contentHash.slice(0, 12),
    signature: args.signature,
    patientStamp: args.patientStamp,
  };
}
