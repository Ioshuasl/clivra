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

export const conversationIdParamSchema = z.object({
  id: z.string().uuid(),
});

export type ConversationIdParamSchema = z.infer<typeof conversationIdParamSchema>;

export const conversationListQuerySchema = z.object({
  status: z.enum(['OPEN', 'PENDING', 'CLOSED']).optional(),
  patientId: z.string().uuid().optional(),
  q: z.string().min(1).max(120).optional(),
  unread: z
    .union([z.literal('true'), z.literal('false'), z.boolean()])
    .optional()
    .transform((value) => {
      if (value === undefined) return undefined;
      if (typeof value === 'boolean') return value;
      return value === 'true';
    }),
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

export type ConversationListQuerySchema = z.infer<typeof conversationListQuerySchema>;

export const conversationMessagesQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type ConversationMessagesQuerySchema = z.infer<typeof conversationMessagesQuerySchema>;

export const conversationPatchSchema = z
  .object({
    assignedToUserId: z.string().uuid().nullable().optional(),
    status: z.enum(['OPEN', 'PENDING', 'CLOSED']).optional(),
    patientId: z.string().uuid().nullable().optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.assignedToUserId !== undefined ||
      value.status !== undefined ||
      value.patientId !== undefined,
    { message: 'Informe assignedToUserId, status ou patientId.' },
  );

export type ConversationPatchSchema = z.infer<typeof conversationPatchSchema>;

export const messageSendSchema = z
  .object({
    text: z.string().min(1).max(4096).optional(),
    mediaStorageKey: z.string().min(1).max(512).optional(),
  })
  .strict()
  .refine((value) => Boolean(value.text?.trim()) || Boolean(value.mediaStorageKey), {
    message: 'Informe text ou mediaStorageKey.',
  });

export type MessageSendSchema = z.infer<typeof messageSendSchema>;

export const mediaPresignSchema = z
  .object({
    fileName: z.string().min(1).max(180),
    mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
    sizeBytes: z.number().int().positive().max(20 * 1024 * 1024),
  })
  .strict();

export type MediaPresignSchema = z.infer<typeof mediaPresignSchema>;
