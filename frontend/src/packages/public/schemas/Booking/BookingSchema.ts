import { z } from 'zod';

export const BookingIdentitySchema = z.object({
  name: z.string().min(3, 'Informe seu nome').max(200),
  phone: z
    .string()
    .min(10, 'Informe um telefone válido')
    .max(20)
    .refine((value) => value.replace(/\D/g, '').length >= 10, 'Informe um telefone válido'),
  email: z.string().min(1, 'Informe o e-mail').email('Esse e-mail parece incompleto. Ex.: nome@clinica.com'),
  patientNote: z.string().max(500, 'Máximo 500 caracteres').optional(),
  consentDataProcessing: z
    .boolean()
    .refine((value) => value, 'É necessário autorizar o tratamento dos dados.'),
  consentTerms: z.boolean().refine((value) => value, 'É necessário aceitar os termos.'),
  consentWhatsappMarketing: z.boolean(),
});

export type BookingIdentityFormValues = z.infer<typeof BookingIdentitySchema>;

export const BookingOtpSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Informe o código de 6 dígitos'),
});

export type BookingOtpFormValues = z.infer<typeof BookingOtpSchema>;
