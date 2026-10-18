import { z } from 'zod';
import { CONSENT_CHANNELS, CONSENT_TYPES } from '@/packages/operacional/enum/Patient/ConsentEnum';

const emptyToNull = (value: string | undefined | null) => {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
};

export const PatientCreateSchema = z.object({
  name: z.string().min(3, 'Informe o nome completo').max(200),
  socialName: z.string().max(200).optional().nullable(),
  cpf: z.string().max(14).optional().nullable(),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida')
    .optional()
    .nullable()
    .or(z.literal('')),
  sex: z.string().max(40).optional().nullable(),
  phonePrimary: z.string().min(8, 'Telefone obrigatório').max(30),
  phoneSecondary: z.string().max(30).optional().nullable(),
  email: z.union([z.string().email('E-mail inválido'), z.literal('')]).optional().nullable(),
  notes: z.string().max(4000).optional().nullable(),
});

export type PatientCreateFormValues = z.infer<typeof PatientCreateSchema>;

export const PatientUpdateSchema = z.object({
  name: z.string().min(3, 'Informe o nome completo').max(200),
  socialName: z.string().max(200).optional().nullable(),
  cpf: z.string().max(14).optional().nullable(),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida')
    .optional()
    .nullable()
    .or(z.literal('')),
  sex: z.string().max(40).optional().nullable(),
  phonePrimary: z.string().min(8, 'Telefone obrigatório').max(30),
  phoneSecondary: z.string().max(30).optional().nullable(),
  email: z.union([z.string().email('E-mail inválido'), z.literal('')]).optional().nullable(),
  notes: z.string().max(4000).optional().nullable(),
  active: z.boolean(),
});

export type PatientUpdateFormValues = z.infer<typeof PatientUpdateSchema>;

export const GuardianCreateSchema = z.object({
  name: z.string().min(2, 'Nome obrigatório').max(120),
  cpf: z.string().max(14).optional().nullable(),
  relationship: z.string().max(80).optional().nullable(),
  phone: z.string().min(8, 'Telefone obrigatório').max(30).optional().nullable(),
  email: z.union([z.string().email('E-mail inválido'), z.literal('')]).optional().nullable(),
});

export type GuardianCreateFormValues = z.infer<typeof GuardianCreateSchema>;

export const ConsentCreateSchema = z.object({
  type: z.enum(CONSENT_TYPES),
  granted: z.boolean(),
  documentVersion: z.string().min(1, 'Versão obrigatória').max(40),
  channel: z.enum(CONSENT_CHANNELS),
});

export type ConsentCreateFormValues = z.infer<typeof ConsentCreateSchema>;

export function toPatientCreatePayload(values: PatientCreateFormValues) {
  return {
    name: values.name.trim(),
    socialName: emptyToNull(values.socialName),
    cpf: emptyToNull(values.cpf),
    birthDate: emptyToNull(values.birthDate),
    sex: emptyToNull(values.sex),
    phonePrimary: values.phonePrimary.trim(),
    phoneSecondary: emptyToNull(values.phoneSecondary),
    email: emptyToNull(values.email),
    notes: emptyToNull(values.notes),
  };
}

export function toPatientUpdatePayload(values: PatientUpdateFormValues) {
  return {
    ...toPatientCreatePayload(values),
    active: values.active,
  };
}

export function toGuardianPayload(values: GuardianCreateFormValues) {
  return {
    name: values.name.trim(),
    cpf: emptyToNull(values.cpf),
    relationship: emptyToNull(values.relationship),
    phone: emptyToNull(values.phone),
    email: emptyToNull(values.email),
  };
}
