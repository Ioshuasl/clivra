export const ALERT_CATEGORIES = ['ALLERGY', 'CONDITION', 'MEDICATION', 'OTHER'] as const;

export type AlertCategory = (typeof ALERT_CATEGORIES)[number];

export const ALERT_CATEGORY_LABELS: Record<AlertCategory, string> = {
  ALLERGY: 'Alergia',
  CONDITION: 'Problema de saúde',
  MEDICATION: 'Medicamento',
  OTHER: 'Outro',
};
