import { z } from 'zod';
import { CONSENT_CHANNELS, CONSENT_TYPES } from '../enum/consent/consent.enum.js';

const addressSchema = z
  .object({
    street: z.string().max(200).optional(),
    number: z.string().max(20).optional(),
    complement: z.string().max(100).optional(),
    district: z.string().max(100).optional(),
    city: z.string().max(100).optional(),
    state: z.string().length(2).optional(),
    postalCode: z.string().max(20).optional(),
  })
  .optional()
  .nullable();

const guardianInputSchema = z
  .object({
    name: z.string().min(2).max(120),
    cpf: z.string().max(14).optional().nullable(),
    relationship: z.string().max(80).optional().nullable(),
    phone: z.string().min(8).max(30).optional().nullable(),
    email: z.string().email().max(255).optional().nullable(),
  })
  .strict();

export const patientCreateSchema = z
  .object({
    unitId: z.string().uuid().optional(),
    name: z.string().min(3).max(200),
    socialName: z.string().max(200).optional().nullable(),
    cpf: z.string().max(14).optional().nullable(),
    birthDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .nullable(),
    sex: z.string().max(40).optional().nullable(),
    phonePrimary: z.string().min(8).max(30),
    phoneSecondary: z.string().max(30).optional().nullable(),
    email: z.string().email().max(255).optional().nullable(),
    address: addressSchema,
    howFoundUs: z.string().max(120).optional().nullable(),
    notes: z.string().max(4000).optional().nullable(),
    guardians: z.array(guardianInputSchema).max(5).optional(),
  })
  .strict();

export type PatientCreateSchema = z.infer<typeof patientCreateSchema>;

export const patientUpdateSchema = z
  .object({
    name: z.string().min(3).max(200).optional(),
    socialName: z.string().max(200).optional().nullable(),
    cpf: z.string().max(14).optional().nullable(),
    birthDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .nullable(),
    sex: z.string().max(40).optional().nullable(),
    phonePrimary: z.string().min(8).max(30).optional(),
    phoneSecondary: z.string().max(30).optional().nullable(),
    email: z.string().email().max(255).optional().nullable(),
    address: addressSchema,
    howFoundUs: z.string().max(120).optional().nullable(),
    notes: z.string().max(4000).optional().nullable(),
    active: z.boolean().optional(),
  })
  .strict();

export type PatientUpdateSchema = z.infer<typeof patientUpdateSchema>;

export const patientIdParamSchema = z.object({ id: z.string().uuid() });

export const patientListQuerySchema = z.object({
  search: z.string().max(120).optional(),
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  active: z.enum(['true', 'false']).optional(),
});

export type PatientListQuerySchema = z.infer<typeof patientListQuerySchema>;

export const patientDeleteQuerySchema = z.object({
  confirmFutureAppointments: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
});

export type PatientDeleteQuerySchema = z.infer<typeof patientDeleteQuerySchema>;

export const checkDuplicateQuerySchema = z.object({
  cpf: z.string().max(14).optional(),
  phone: z.string().max(30).optional(),
});

export type CheckDuplicateQuerySchema = z.infer<typeof checkDuplicateQuerySchema>;

export const guardianCreateSchema = guardianInputSchema;

export type GuardianCreateSchema = z.infer<typeof guardianCreateSchema>;

export const consentCreateSchema = z
  .object({
    type: z.enum(CONSENT_TYPES),
    granted: z.boolean().default(true),
    documentVersion: z.string().min(1).max(40),
    channel: z.enum(CONSENT_CHANNELS),
  })
  .strict();

export type ConsentCreateSchema = z.infer<typeof consentCreateSchema>;
