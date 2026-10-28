import { z } from 'zod';

export const DocumentSignatureSchema = z.object({
  agree: z.boolean().refine((value) => value, 'Marque que você leu e concorda para assinar.'),
  code: z.string().regex(/^\d{6}$/, 'Digite os 6 números do código.').or(z.literal('')),
});

export type DocumentSignatureFormValues = z.infer<typeof DocumentSignatureSchema>;
