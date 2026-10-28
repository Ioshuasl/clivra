import { z } from 'zod';
import { TOOTH_FACES } from '../enum/quote/tooth_face.enum.js';
import { TREATMENT_PLAN_STATUSES } from '../enum/treatment_plan/treatment_plan_status.enum.js';

export const treatmentPlanIdParamSchema = z.object({ id: z.string().uuid() });

export const treatmentPlanListQuerySchema = z.object({
  patientId: z.string().uuid().optional(),
  status: z.enum(TREATMENT_PLAN_STATUSES).optional(),
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export type TreatmentPlanListQuerySchema = z.infer<typeof treatmentPlanListQuerySchema>;

export const treatmentItemIdParamSchema = z.object({ id: z.string().uuid() });

export const treatmentItemExecuteSchema = z
  .object({
    appointmentId: z.string().uuid().optional().nullable(),
    note: z.string().min(10).max(20000),
    toothState: z.string().min(1).max(40).optional(),
    justification: z.string().max(2000).optional().nullable(),
  })
  .strict();

export type TreatmentItemExecuteSchema = z.infer<typeof treatmentItemExecuteSchema>;

export const treatmentItemBatchExecuteSchema = z
  .object({
    itemIds: z.array(z.string().uuid()).min(1).max(50),
    note: z.string().min(10).max(20000),
    appointmentId: z.string().uuid().optional().nullable(),
    toothStates: z
      .record(
        z.string().uuid(),
        z
          .object({
            toothState: z.string().min(1).max(40),
            justification: z.string().max(2000).optional().nullable(),
          })
          .strict(),
      )
      .optional(),
  })
  .strict();

export type TreatmentItemBatchExecuteSchema = z.infer<typeof treatmentItemBatchExecuteSchema>;

export const treatmentItemCancelSchema = z
  .object({
    reason: z.string().min(10).max(2000),
  })
  .strict();

export type TreatmentItemCancelSchema = z.infer<typeof treatmentItemCancelSchema>;

export const treatmentItemCreateSchema = z
  .object({
    patientId: z.string().uuid(),
    procedureId: z.string().uuid(),
    toothCode: z.string().min(2).max(3).optional().nullable(),
    face: z.enum(TOOTH_FACES).optional().nullable(),
  })
  .strict();

export type TreatmentItemCreateSchema = z.infer<typeof treatmentItemCreateSchema>;
