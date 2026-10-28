export const publicQueryKeys = {
  clinic: (slug: string) => ['public-clinic', slug] as const,
  availability: (slug: string, professionalId: string, from: string, to: string) =>
    ['public-availability', slug, professionalId, from, to] as const,
  confirm: (token: string) => ['public-booking-confirm', token] as const,
  anamnesis: (token: string) => ['public-anamnesis', token] as const,
  quote: (token: string) => ['public-quote', token] as const,
  documentSignature: (token: string) => ['public-document-signature', token] as const,
};
