import { z } from 'zod';
import { AUTOMATION_KEYS } from '../enum/automation/automation.enum.js';

export const accountConnectSchema = z
  .object({
    riskAccepted: z.literal(true),
    unitId: z.string().uuid().optional().nullable(),
  })
  .strict();

export type AccountConnectSchema = z.infer<typeof accountConnectSchema>;

export const accountPatchSchema = z
  .object({
    killSwitch: z.boolean(),
  })
  .strict();

export type AccountPatchSchema = z.infer<typeof accountPatchSchema>;

export const accountTestSchema = z
  .object({
    to: z.string().min(10).max(20).optional(),
  })
  .strict();

export type AccountTestSchema = z.infer<typeof accountTestSchema>;

export const automationKeyParamSchema = z.object({
  key: z.enum(AUTOMATION_KEYS),
});

export const automationPatchSchema = z
  .object({
    enabled: z.boolean().optional(),
    config: z
      .object({
        sendAtLocalTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
        offsetHours: z.number().int().min(1).max(72).optional(),
        onlyForStatuses: z.array(z.string().min(1)).max(8).optional(),
        templateKey: z.string().min(1).max(80).optional(),
      })
      .strict()
      .optional(),
  })
  .strict()
  .refine((value) => value.enabled !== undefined || value.config !== undefined, {
    message: 'Informe enabled ou config.',
  });

export type AutomationPatchSchema = z.infer<typeof automationPatchSchema>;

export const logsQuerySchema = z.object({
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  result: z.string().min(1).max(64).optional(),
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type LogsQuerySchema = z.infer<typeof logsQuerySchema>;
