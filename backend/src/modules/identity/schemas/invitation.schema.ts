import { z } from 'zod';
import { Role } from '../enum/role/role.enum.js';

const roleSchema = z.enum([
  Role.OWNER,
  Role.DENTIST,
  Role.RECEPTION,
  Role.ASSISTANT,
  Role.FINANCE,
]);

export const invitationCreateSchema = z.object({
  email: z.string().email().max(255),
  role: roleSchema,
});

export const invitationAcceptSchema = z.object({
  token: z.string().min(1).max(512),
  name: z.string().min(2).max(120),
  password: z.string().min(10).max(128),
});

export const invitationIdParamSchema = z.object({
  id: z.string().uuid(),
});

export type InvitationCreateSchema = z.infer<typeof invitationCreateSchema>;
export type InvitationAcceptSchema = z.infer<typeof invitationAcceptSchema>;
