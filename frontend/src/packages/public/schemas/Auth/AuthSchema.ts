import { z } from 'zod';

export const AuthLoginSchema = z.object({
  email: z.string().min(1, 'Informe o e-mail').email('Esse e-mail parece incompleto. Ex.: nome@clinica.com'),
  password: z.string().min(1, 'Informe a senha'),
});

export type AuthLoginFormValues = z.infer<typeof AuthLoginSchema>;

export const AuthSignupSchema = z.object({
  email: z.string().min(1, 'Informe o e-mail').email('Esse e-mail parece incompleto. Ex.: nome@clinica.com'),
  password: z.string().min(10, 'A senha deve ter no mínimo 10 caracteres'),
  clinicName: z.string().min(2, 'Nome da clínica obrigatório').max(120),
  ownerName: z.string().min(2, 'Seu nome é obrigatório').max(120),
});

export type AuthSignupFormValues = z.infer<typeof AuthSignupSchema>;

export const AuthForgotPasswordSchema = z.object({
  email: z.string().min(1, 'Informe o e-mail').email('Esse e-mail parece incompleto. Ex.: nome@clinica.com'),
});

export type AuthForgotPasswordFormValues = z.infer<typeof AuthForgotPasswordSchema>;

export const AuthResetPasswordSchema = z.object({
  token: z.string().min(1, 'Token inválido'),
  password: z.string().min(10, 'A senha deve ter no mínimo 10 caracteres'),
});

export type AuthResetPasswordFormValues = z.infer<typeof AuthResetPasswordSchema>;
