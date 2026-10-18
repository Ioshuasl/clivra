import { z } from 'zod';

export const signupSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(10).max(128),
  clinicName: z.string().min(2).max(120),
  ownerName: z.string().min(2).max(120),
});

export const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(128),
});

export const passwordForgotSchema = z.object({
  email: z.string().email().max(255),
});

export const passwordResetSchema = z.object({
  token: z.string().min(1).max(512),
  password: z.string().min(10).max(128),
});

export const switchTenantSchema = z.object({
  tenantId: z.string().uuid(),
});

export type SignupSchema = z.infer<typeof signupSchema>;
export type LoginSchema = z.infer<typeof loginSchema>;
export type PasswordForgotSchema = z.infer<typeof passwordForgotSchema>;
export type PasswordResetSchema = z.infer<typeof passwordResetSchema>;
export type SwitchTenantSchema = z.infer<typeof switchTenantSchema>;
