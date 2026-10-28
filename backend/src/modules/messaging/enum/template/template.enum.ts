export const TEMPLATE_KEYS = [
  'appointment_created',
  'appointment_confirmation',
  'appointment_reminder',
  'appointment_cancelled',
  'waitlist_offer',
  'anamnesis_request',
  'quote_sent',
  'payment_receipt',
  'payment_overdue',
  'document_signature_request',
  'document_signature_code',
] as const;

export type TemplateKey = (typeof TEMPLATE_KEYS)[number];

export const TEMPLATE_CATEGORIES = ['UTILITY', 'MARKETING', 'AUTHENTICATION'] as const;

export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];

export const AGENDA_TEMPLATE_KEYS: readonly TemplateKey[] = [
  'appointment_created',
  'appointment_confirmation',
  'appointment_reminder',
  'appointment_cancelled',
];
