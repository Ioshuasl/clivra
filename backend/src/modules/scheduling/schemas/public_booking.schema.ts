import { z } from 'zod';

export const publicClinicSlugParamSchema = z.object({
  slug: z.string().min(1),
});

export const publicAvailabilityQuerySchema = z.object({
  procedureId: z.string().uuid(),
  professionalId: z.string().uuid(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export type PublicAvailabilityQuerySchema = z.infer<typeof publicAvailabilityQuerySchema>;

export const publicBookingCreateSchema = z
  .object({
    procedureId: z.string().uuid(),
    professionalId: z.string().uuid(),
    startsAt: z.string().min(1),
    name: z.string().min(3),
    phone: z.string().min(10),
    email: z.string().email().optional().nullable(),
    consentDataProcessing: z.boolean(),
    consentTerms: z.boolean(),
    consentWhatsappMarketing: z.boolean().default(false),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (Number.isNaN(Date.parse(value.startsAt))) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'startsAt inválido', path: ['startsAt'] });
    }
  });

export type PublicBookingCreateSchema = z.infer<typeof publicBookingCreateSchema>;

export const publicBookingVerifySchema = z
  .object({
    bookingId: z.string().min(8),
    code: z.string().regex(/^\d{6}$/),
  })
  .strict();

export type PublicBookingVerifySchema = z.infer<typeof publicBookingVerifySchema>;

export const publicConfirmTokenParamSchema = z.object({
  token: z.string().min(8),
});
