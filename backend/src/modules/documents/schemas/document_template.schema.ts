import { z } from 'zod';
import { DOCUMENT_KINDS } from '../enum/document/document_kind.enum.js';
import { SIGNATURE_POLICIES } from '../enum/document/signature_policy.enum.js';
import type { TiptapNode } from '../types/document/tiptap.types.js';

const MAX_CONTENT_BYTES = 200_000;

const tiptapNodeSchema: z.ZodType<TiptapNode> = z.lazy(() =>
  z
    .object({
      type: z.string().min(1).max(60),
      text: z.string().max(20_000).optional(),
      attrs: z.record(z.string(), z.unknown()).optional(),
      marks: z
        .array(z.object({ type: z.string().min(1).max(40), attrs: z.record(z.string(), z.unknown()).optional() }))
        .optional(),
      content: z.array(tiptapNodeSchema).optional(),
    })
    .strict(),
);

export const tiptapDocSchema = z
  .object({
    type: z.literal('doc'),
    content: z.array(tiptapNodeSchema).min(1).max(2000),
  })
  .strict()
  .refine((doc) => JSON.stringify(doc).length <= MAX_CONTENT_BYTES, {
    message: 'Conteúdo muito grande.',
  });

export const documentTemplateCreateSchema = z
  .object({
    kind: z.enum(DOCUMENT_KINDS),
    name: z.string().trim().min(1).max(120),
    content: tiptapDocSchema,
    professionalSignature: z.enum(SIGNATURE_POLICIES).default('NONE'),
    patientSignature: z.enum(SIGNATURE_POLICIES).default('NONE'),
  })
  .strict();

export type DocumentTemplateCreateSchema = z.infer<typeof documentTemplateCreateSchema>;

export const documentTemplateUpdateSchema = z
  .object({
    kind: z.enum(DOCUMENT_KINDS).optional(),
    name: z.string().trim().min(1).max(120).optional(),
    content: tiptapDocSchema.optional(),
    professionalSignature: z.enum(SIGNATURE_POLICIES).optional(),
    patientSignature: z.enum(SIGNATURE_POLICIES).optional(),
    active: z.boolean().optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: 'Nada para atualizar.' });

export type DocumentTemplateUpdateSchema = z.infer<typeof documentTemplateUpdateSchema>;

export const documentTemplateParamSchema = z.object({ templateId: z.string().uuid() });

export const documentTemplateListQuerySchema = z.object({
  kind: z.enum(DOCUMENT_KINDS).optional(),
  includeInactive: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
});

export type DocumentTemplateListQuerySchema = z.infer<typeof documentTemplateListQuerySchema>;

export const documentTemplatePreviewSchema = z
  .object({
    patientId: z.string().uuid(),
    professionalId: z.string().uuid().optional(),
  })
  .strict();

export type DocumentTemplatePreviewSchema = z.infer<typeof documentTemplatePreviewSchema>;
