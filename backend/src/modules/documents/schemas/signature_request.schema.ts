import { z } from 'zod';
import { PATIENT_SIGNATURE_METHODS } from '../enum/signature/patient_signature_method.enum.js';

export const documentSettingUpdateSchema = z
  .object({
    patientSignatureMethod: z.enum(PATIENT_SIGNATURE_METHODS).optional(),
    quoteContractTemplateId: z.string().uuid().nullable().optional(),
    quoteContractAuto: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, { message: 'Nada para atualizar.' });

export type DocumentSettingUpdateSchema = z.infer<typeof documentSettingUpdateSchema>;

export const signatureRequestCreateSchema = z
  .object({ channel: z.enum(['WHATSAPP', 'EMAIL', 'COPY']).default('COPY') })
  .strict();

export type SignatureRequestCreateSchema = z.infer<typeof signatureRequestCreateSchema>;

export const publicSignatureTokenParamSchema = z.object({ token: z.string().min(10).max(200) });

/** O paciente confirma que leu; no método por código, informa os 6 dígitos recebidos. */
export const publicSignatureSignSchema = z
  .object({
    agree: z.literal(true),
    code: z
      .string()
      .regex(/^\d{6}$/)
      .optional(),
  })
  .strict();

export type PublicSignatureSignSchema = z.infer<typeof publicSignatureSignSchema>;
