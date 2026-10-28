import { z } from 'zod';
import { documentHasText } from '@/packages/operacional/helpers/DocumentContent';
import type { TiptapDoc } from '@/packages/operacional/types/Document/DocumentTypes';

export const DocumentIssueSchema = z.object({
  templateId: z.string().min(1, 'Escolha um modelo.'),
  professionalId: z.string().min(1, 'Escolha o profissional responsável.'),
  title: z.string().trim().min(1, 'Dê um título ao documento.').max(160, 'Use até 160 caracteres.'),
  amendReason: z.string().trim().max(500),
  content: z.custom<TiptapDoc>(
    (value) => documentHasText(value as TiptapDoc | undefined),
    'O documento está vazio.',
  ),
});

export type DocumentIssueFormValues = z.infer<typeof DocumentIssueSchema>;

export const DocumentCancelSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(10, 'Explique o motivo com pelo menos 10 letras.')
    .max(500, 'Use até 500 caracteres.'),
});

export type DocumentCancelFormValues = z.infer<typeof DocumentCancelSchema>;
