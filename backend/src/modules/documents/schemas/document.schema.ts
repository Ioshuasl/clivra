import { z } from 'zod';
import { tiptapDocSchema } from './document_template.schema.js';

export const documentPatientParamSchema = z.object({ patientId: z.string().uuid() });

export const documentParamSchema = z.object({ documentId: z.string().uuid() });

/** Emissão: parte de um modelo; `content` opcional permite ajustar o texto só deste documento. */
export const documentCreateSchema = z
  .object({
    templateId: z.string().uuid(),
    professionalId: z.string().uuid().optional(),
    title: z.string().trim().min(1).max(160).optional(),
    content: tiptapDocSchema.optional(),
    supersedesId: z.string().uuid().optional(),
    amendReason: z.string().trim().max(500).optional(),
  })
  .strict();

export type DocumentCreateSchema = z.infer<typeof documentCreateSchema>;

export const documentCancelSchema = z
  .object({ reason: z.string().trim().min(10).max(500) })
  .strict();

export type DocumentCancelSchema = z.infer<typeof documentCancelSchema>;
