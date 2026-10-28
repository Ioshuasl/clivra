import { z } from 'zod';
import { SEND_LINK_CHANNELS } from '../enum/anamnesis/send_link_channel.enum.js';

export const anamnesisAnswersSchema = z
  .object({
    answers: z.record(z.string(), z.unknown()),
    professionalId: z.string().uuid().optional(),
  })
  .strict();

export type AnamnesisAnswersSchema = z.infer<typeof anamnesisAnswersSchema>;

export const anamnesisSendLinkSchema = z
  .object({
    channel: z.enum(SEND_LINK_CHANNELS),
    professionalId: z.string().uuid().optional(),
  })
  .strict();

export type AnamnesisSendLinkSchema = z.infer<typeof anamnesisSendLinkSchema>;

export const publicAnamnesisTokenParamSchema = z
  .object({
    token: z.string().min(8).max(200),
  })
  .strict();

export type PublicAnamnesisTokenParamSchema = z.infer<typeof publicAnamnesisTokenParamSchema>;
