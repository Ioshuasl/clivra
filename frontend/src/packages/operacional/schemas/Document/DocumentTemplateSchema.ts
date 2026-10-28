import { z } from 'zod';
import { DOCUMENT_KINDS } from '@/packages/operacional/enum/Document/DocumentKindEnum';
import { SIGNATURE_POLICIES } from '@/packages/operacional/enum/Document/SignaturePolicyEnum';
import { documentHasText } from '@/packages/operacional/helpers/DocumentContent';
import type { TiptapDoc } from '@/packages/operacional/types/Document/DocumentTypes';

export const DocumentTemplateSchema = z.object({
  name: z.string().trim().min(1, 'Dê um nome ao modelo.').max(120, 'Use até 120 caracteres.'),
  kind: z.enum(DOCUMENT_KINDS),
  professionalSignature: z.enum(SIGNATURE_POLICIES),
  patientSignature: z.enum(SIGNATURE_POLICIES),
  content: z.custom<TiptapDoc>(
    (value) => documentHasText(value as TiptapDoc | undefined),
    'Escreva o texto do modelo.',
  ),
});

export type DocumentTemplateFormValues = z.infer<typeof DocumentTemplateSchema>;
