import { z } from 'zod';

const MAX_PFX_BASE64 = 200_000;

export const certificateUploadSchema = z
  .object({
    pfxBase64: z.string().min(1).max(MAX_PFX_BASE64),
    password: z.string().min(1).max(200),
  })
  .strict();

export type CertificateUploadSchema = z.infer<typeof certificateUploadSchema>;

export const documentSignSchema = z.object({ password: z.string().min(1).max(200) }).strict();

export type DocumentSignSchema = z.infer<typeof documentSignSchema>;
