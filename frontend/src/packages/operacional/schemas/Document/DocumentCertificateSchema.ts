import { z } from 'zod';

export const CertificateSchema = z.object({
  file: z.custom<File>((value) => typeof File !== 'undefined' && value instanceof File, 'Escolha o arquivo do certificado.'),
  password: z.string().min(1, 'Digite a senha do certificado.').max(200, 'Senha muito longa.'),
});

export type CertificateFormValues = z.infer<typeof CertificateSchema>;

export const DocumentSignSchema = z.object({
  password: z.string().min(1, 'Digite a senha do certificado.').max(200, 'Senha muito longa.'),
});

export type DocumentSignFormValues = z.infer<typeof DocumentSignSchema>;
