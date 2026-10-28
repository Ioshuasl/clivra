import { z } from 'zod';
import { ALERT_CATEGORIES } from '../enum/clinical_alert/alert_category.enum.js';
import { ALERT_SEVERITIES } from '../enum/clinical_alert/alert_severity.enum.js';
import { QUESTION_TYPES } from '../enum/anamnesis/question_type.enum.js';

const alertWhenSchema = z
  .object({
    equals: z.unknown().optional(),
    notEquals: z.unknown().optional(),
  })
  .strict()
  .refine((v) => v.equals !== undefined || v.notEquals !== undefined, {
    message: 'alertWhen precisa de equals ou notEquals',
  });

const questionSchema = z
  .object({
    id: z.string().min(1).max(80),
    label: z.string().min(1).max(500),
    type: z.enum(QUESTION_TYPES),
    required: z.boolean().optional(),
    options: z.array(z.string().min(1).max(200)).optional(),
    alertWhen: alertWhenSchema.optional(),
    alertSeverity: z.enum(ALERT_SEVERITIES).optional(),
    alertCategory: z.enum(ALERT_CATEGORIES).optional(),
    showWhen: z
      .object({
        patientGender: z.string().min(1).max(20).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export const anamnesisFormCreateSchema = z
  .object({
    name: z.string().min(1).max(120),
    questions: z.array(questionSchema).min(1),
  })
  .strict();

export type AnamnesisFormCreateSchema = z.infer<typeof anamnesisFormCreateSchema>;

export const anamnesisFormAssignmentParamSchema = z.object({ professionalId: z.string().uuid() });

export const anamnesisFormAssignmentSetSchema = z
  .object({ formName: z.string().min(1).max(120).nullable() })
  .strict();

export type AnamnesisFormAssignmentSetSchema = z.infer<typeof anamnesisFormAssignmentSetSchema>;

export const anamnesisFormResolveQuerySchema = z.object({
  professionalId: z.string().uuid().optional(),
});
