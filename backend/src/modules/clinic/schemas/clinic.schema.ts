import { z } from 'zod';
import { PAYMENT_METHODS } from '../enum/payment_method/payment_method.enum.js';

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Horário inválido (HH:mm)');

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
  .optional();

export const clinicUpdateSchema = z
  .object({
    name: z.string().min(2).max(120).optional(),
    legalName: z.string().max(200).optional().nullable(),
    taxId: z.string().max(20).optional().nullable(),
    responsibleCro: z.string().max(20).optional().nullable(),
    timezone: z.string().min(3).max(64).optional(),
    acceptedPaymentMethods: z.array(z.enum(PAYMENT_METHODS as [string, ...string[]])).min(1).optional(),
    phone: z.string().max(30).optional().nullable(),
    address: addressSchema.nullable(),
  })
  .strict();

export type ClinicUpdateSchema = z.infer<typeof clinicUpdateSchema>;

export const unitCreateSchema = z
  .object({
    name: z.string().min(2).max(120),
    phone: z.string().max(30).optional().nullable(),
    address: addressSchema.nullable(),
    isDefault: z.boolean().optional(),
  })
  .strict();

export type UnitCreateSchema = z.infer<typeof unitCreateSchema>;

export const unitUpdateSchema = z
  .object({
    name: z.string().min(2).max(120).optional(),
    phone: z.string().max(30).optional().nullable(),
    address: addressSchema.nullable(),
    isDefault: z.boolean().optional(),
  })
  .strict();

export type UnitUpdateSchema = z.infer<typeof unitUpdateSchema>;

export const unitIdParamSchema = z.object({ id: z.string().uuid() });

export const chairCreateSchema = z
  .object({
    name: z.string().min(1).max(80),
    color: z.string().max(20).optional().nullable(),
  })
  .strict();

export type ChairCreateSchema = z.infer<typeof chairCreateSchema>;

export const chairUpdateSchema = z
  .object({
    name: z.string().min(1).max(80).optional(),
    color: z.string().max(20).optional().nullable(),
    active: z.boolean().optional(),
  })
  .strict();

export type ChairUpdateSchema = z.infer<typeof chairUpdateSchema>;

export const chairIdParamSchema = z.object({
  unitId: z.string().uuid(),
  chairId: z.string().uuid(),
});

export const businessHoursQuerySchema = z.object({
  unitId: z.string().uuid(),
  professionalId: z.string().uuid().optional(),
});

export const businessHoursSlotSchema = z.object({
  weekday: z.number().int().min(1).max(7),
  startsAt: timeSchema,
  endsAt: timeSchema,
});

export const businessHoursReplaceSchema = z
  .object({
    unitId: z.string().uuid(),
    professionalId: z.string().uuid().optional().nullable(),
    slots: z.array(businessHoursSlotSchema).max(50),
  })
  .strict();

export type BusinessHoursReplaceSchema = z.infer<typeof businessHoursReplaceSchema>;

export const businessHoursExceptionSchema = z
  .object({
    unitId: z.string().uuid(),
    professionalId: z.string().uuid().optional().nullable(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    closed: z.boolean().default(true),
    startsAt: timeSchema.optional().nullable(),
    endsAt: timeSchema.optional().nullable(),
    reason: z.string().max(200).optional().nullable(),
  })
  .strict();

export type BusinessHoursExceptionSchema = z.infer<typeof businessHoursExceptionSchema>;

export const professionalCreateSchema = z
  .object({
    membershipId: z.string().uuid(),
    croNumber: z.string().max(20).optional().nullable(),
    croState: z.string().length(2).optional().nullable(),
    specialties: z.array(z.string().max(80)).max(10).optional(),
    color: z.string().max(20).optional().nullable(),
  })
  .strict();

export type ProfessionalCreateSchema = z.infer<typeof professionalCreateSchema>;

export const professionalUpdateSchema = z
  .object({
    croNumber: z.string().max(20).optional().nullable(),
    croState: z.string().length(2).optional().nullable(),
    specialties: z.array(z.string().max(80)).max(10).optional(),
    color: z.string().max(20).optional().nullable(),
    active: z.boolean().optional(),
  })
  .strict();

export type ProfessionalUpdateSchema = z.infer<typeof professionalUpdateSchema>;

export const professionalIdParamSchema = z.object({ id: z.string().uuid() });

export const onboardingUpdateSchema = z
  .object({
    skipStep: z.enum([
      'clinic',
      'hours',
      'professionals',
      'procedures',
      'team',
      'whatsapp',
      'firstAppointment',
    ] as const),
  })
  .strict();

export type OnboardingUpdateSchema = z.infer<typeof onboardingUpdateSchema>;

export const procedureListQuerySchema = z.object({
  search: z.string().max(100).optional(),
  specialty: z.string().max(80).optional(),
  active: z.enum(['true', 'false']).optional(),
});

export const procedureCreateSchema = z
  .object({
    code: z.string().min(2).max(20),
    name: z.string().min(2).max(200),
    specialty: z.string().max(80).optional().nullable(),
    defaultMinutes: z.number().int().min(5).max(480),
    priceCents: z.number().int().min(0),
    requiresTooth: z.boolean().optional(),
    requiresFace: z.boolean().optional(),
  })
  .strict();

export type ProcedureCreateSchema = z.infer<typeof procedureCreateSchema>;

export const procedureUpdateSchema = z
  .object({
    name: z.string().min(2).max(200).optional(),
    specialty: z.string().max(80).optional().nullable(),
    defaultMinutes: z.number().int().min(5).max(480).optional(),
    priceCents: z.number().int().min(0).optional(),
    requiresTooth: z.boolean().optional(),
    requiresFace: z.boolean().optional(),
    active: z.boolean().optional(),
  })
  .strict();

export type ProcedureUpdateSchema = z.infer<typeof procedureUpdateSchema>;

export const procedureIdParamSchema = z.object({ id: z.string().uuid() });
