import { z } from 'zod';
import { ROLES } from '@/packages/admin/enum/RoleEnum';

export const InvitationCreateSchema = z.object({
  email: z.string().min(1, 'Informe o e-mail').email('Esse e-mail parece incompleto. Ex.: nome@clinica.com').max(255),
  role: z.enum(ROLES as [string, ...string[]]),
});

export type InvitationCreateFormValues = z.infer<typeof InvitationCreateSchema>;
